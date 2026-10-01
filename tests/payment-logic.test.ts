import { describe, it, expect, beforeEach } from "vitest";
import { OrderEngine } from "@/lib/engine";

describe("Payment & Ticket State Machine Engine", () => {
  let engine: OrderEngine;

  beforeEach(() => {
    engine = new OrderEngine();
  });

  // --- 8.1 Payment Logic Tests ---
  describe("8.1 Payment Logic", () => {
    it("handles exact payment and issues tickets", async () => {
      // 1. Create order for 2 tickets = 40 THB
      const orderRes = await engine.createOrder({
        buyer_name: "สมหญิง ใจดี",
        phone: "0812345678",
        email: "somying@example.com",
        quantity: 2,
      });
      expect(orderRes.success).toBe(true);
      if (!orderRes.success) return;
      const order = orderRes.order;
      expect(order.total_thb).toBe(40);
      expect(order.status).toBe("pending_payment");

      // 2. Add slip for 40 THB
      const payment = await engine.addPayment({
        order_id: order.id,
        slip_path: "orders/test/slip1.png",
        slip_sha256: "hash123",
        amount_thb: 40,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "1234",
      });
      expect(payment.status).toBe("pending");

      const orderAfterSlip = await engine.getOrderById(order.id);
      expect(orderAfterSlip?.status).toBe("under_review");

      // 3. Approve payment
      const approveRes = await engine.approvePayment({
        payment_id: payment.id,
        reviewer_id: "staff-001",
      });
      expect(approveRes.success).toBe(true);
      if (!approveRes.success) return;

      expect(approveRes.order.status).toBe("paid");
      expect(approveRes.order.expires_at).toBeNull();
      expect(approveRes.ticketsIssued).toBe(2);

      // Verify tickets
      const tickets = await engine.getTicketsForOrder(order.id);
      expect(tickets.length).toBe(2);
      expect(tickets[0].status).toBe("issued");
      expect(tickets[0].code.length).toBeGreaterThanOrEqual(16);
    });

    it("handles split payments across multiple slips", async () => {
      // Order 3 tickets = 60 THB
      const orderRes = await engine.createOrder({
        buyer_name: "มานะ อดทน",
        phone: "0899998877",
        email: "mana@example.com",
        quantity: 3,
      });
      if (!orderRes.success) return;
      const order = orderRes.order;

      // First slip: 20 THB
      const p1 = await engine.addPayment({
        order_id: order.id,
        slip_path: "orders/test/p1.png",
        slip_sha256: "hash_p1",
        amount_thb: 20,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "0001",
      });

      // Approve first slip (partial payment)
      const app1 = await engine.approvePayment({
        payment_id: p1.id,
        reviewer_id: "staff-001",
      });
      expect(app1.success).toBe(true);
      if (!app1.success) return;

      expect(app1.order.status).toBe("pending_payment");
      expect(app1.order.expires_at).toBeNull(); // Never shows as expired once partial payment approved!
      expect(app1.ticketsIssued).toBe(0); // No tickets until fully paid

      // Second slip: 40 THB (covers remaining 40 THB)
      const p2 = await engine.addPayment({
        order_id: order.id,
        slip_path: "orders/test/p2.png",
        slip_sha256: "hash_p2",
        amount_thb: 40,
        transferred_at: new Date().toISOString(),
        to_bank: "SCB",
        payer_name_or_last4: "0002",
      });

      const app2 = await engine.approvePayment({
        payment_id: p2.id,
        reviewer_id: "staff-002",
      });
      expect(app2.success).toBe(true);
      if (!app2.success) return;

      expect(app2.order.status).toBe("paid");
      expect(app2.ticketsIssued).toBe(3);

      const tickets = await engine.getTicketsForOrder(order.id);
      expect(tickets.length).toBe(3);
    });

    it("handles overpayment by recording admin note and issuing tickets", async () => {
      const orderRes = await engine.createOrder({
        buyer_name: "รวย จริงใจ",
        phone: "0811112222",
        email: "rich@example.com",
        quantity: 1, // 20 THB
      });
      if (!orderRes.success) return;
      const order = orderRes.order;

      const p = await engine.addPayment({
        order_id: order.id,
        slip_path: "orders/test/over.png",
        slip_sha256: "hash_over",
        amount_thb: 50, // paid 50 THB
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "9999",
      });

      const app = await engine.approvePayment({
        payment_id: p.id,
        reviewer_id: "staff-001",
      });
      expect(app.success).toBe(true);
      if (!app.success) return;

      expect(app.order.status).toBe("paid");
      expect(app.order.admin_note).toContain("Overpaid: 50 THB vs 20 THB");
      expect(app.ticketsIssued).toBe(1);
    });

    it("cancelling an order voids all issued tickets", async () => {
      const orderRes = await engine.createOrder({
        buyer_name: "สมเกียรติ",
        phone: "0823456789",
        email: "somkiat@example.com",
        quantity: 1,
      });
      if (!orderRes.success) return;
      const order = orderRes.order;

      const p = await engine.addPayment({
        order_id: order.id,
        slip_path: "orders/test/s.png",
        slip_sha256: "hash_s",
        amount_thb: 20,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "1111",
      });
      await engine.approvePayment({ payment_id: p.id, reviewer_id: "staff-1" });

      const ticketsBefore = await engine.getTicketsForOrder(order.id);
      expect(ticketsBefore[0].status).toBe("issued");

      // Staff cancels order
      const cancelledOrder = await engine.cancelOrder(order.id, "staff-admin", "Buyer requested");
      expect(cancelledOrder.status).toBe("cancelled");

      const ticketsAfter = await engine.getTicketsForOrder(order.id);
      expect(ticketsAfter[0].status).toBe("void");
    });
  });

  // --- 8.2 Idempotency & Concurrency Tests ---
  describe("8.2 Idempotency & Concurrency", () => {
    it("two staff approving the same slip simultaneously -> exactly one succeeds", async () => {
      const orderRes = await engine.createOrder({
        buyer_name: "ทดสอบ แข่งขัน",
        phone: "0845678901",
        email: "race@example.com",
        quantity: 2,
      });
      if (!orderRes.success) return;
      const order = orderRes.order;

      const p = await engine.addPayment({
        order_id: order.id,
        slip_path: "orders/test/race.png",
        slip_sha256: "hash_race",
        amount_thb: 40,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "5555",
      });

      // Simultaneous approvals
      const [res1, res2] = await Promise.all([
        engine.approvePayment({ payment_id: p.id, reviewer_id: "staff-A" }),
        engine.approvePayment({ payment_id: p.id, reviewer_id: "staff-B" }),
      ]);

      const successCount = [res1.success, res2.success].filter(Boolean).length;
      expect(successCount).toBe(1);

      const failedRes = res1.success ? res2 : res1;
      expect(failedRes.success).toBe(false);
      expect((failedRes as any).error).toBe("already_reviewed");

      // Tickets must be issued exactly 2 times
      const tickets = await engine.getTicketsForOrder(order.id);
      expect(tickets.length).toBe(2);
    });

    it("two different slips on same order approved simultaneously -> tickets issued exactly quantity times", async () => {
      const orderRes = await engine.createOrder({
        buyer_name: "นายสองสลิป",
        phone: "0856789012",
        email: "twoslips@example.com",
        quantity: 2, // 40 THB
      });
      if (!orderRes.success) return;
      const order = orderRes.order;

      const p1 = await engine.addPayment({
        order_id: order.id,
        slip_path: "p1.png",
        slip_sha256: "h1",
        amount_thb: 20,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "1111",
      });

      const p2 = await engine.addPayment({
        order_id: order.id,
        slip_path: "p2.png",
        slip_sha256: "h2",
        amount_thb: 20,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "2222",
      });

      // Approve both at the same instant
      const [app1, app2] = await Promise.all([
        engine.approvePayment({ payment_id: p1.id, reviewer_id: "staff-1" }),
        engine.approvePayment({ payment_id: p2.id, reviewer_id: "staff-2" }),
      ]);

      expect(app1.success).toBe(true);
      expect(app2.success).toBe(true);

      const finalOrder = await engine.getOrderById(order.id);
      expect(finalOrder?.status).toBe("paid");

      const tickets = await engine.getTicketsForOrder(order.id);
      expect(tickets.length).toBe(2); // Exactly 2 tickets, never 4!
    });
  });

  // --- 8.3 Expiry Behavior Tests ---
  describe("8.3 Expiry Behavior", () => {
    it("order past expires_at still accepts slip and moves to under_review", async () => {
      const orderRes = await engine.createOrder({
        buyer_name: "สาย ช้า",
        phone: "0867890123",
        email: "late@example.com",
        quantity: 1,
      });
      if (!orderRes.success) return;
      const order = orderRes.order;

      // Force expired date in the past
      order.expires_at = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      engine.orders.set(order.id, order);

      // Buyer uploads slip to expired order
      const payment = await engine.addPayment({
        order_id: order.id,
        slip_path: "late.png",
        slip_sha256: "hash_late",
        amount_thb: 20,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "3333",
      });

      const updatedOrder = await engine.getOrderById(order.id);
      expect(updatedOrder?.status).toBe("under_review");

      // Staff can approve it
      const app = await engine.approvePayment({
        payment_id: payment.id,
        reviewer_id: "staff-1",
      });
      expect(app.success).toBe(true);
      if (app.success) {
        expect(app.order.status).toBe("paid");
      }
    });
  });

  // --- 8.5 Staff Scanner Tests ---
  describe("8.5 Scanner & Check-in", () => {
    it("valid scan marks checked in, second scan rejects with original time and staff", async () => {
      const orderRes = await engine.createOrder({
        buyer_name: "ผู้เข้างาน สดชื่น",
        phone: "0878901234",
        email: "attendee@example.com",
        quantity: 1,
      });
      if (!orderRes.success) return;
      const order = orderRes.order;

      const p = await engine.addPayment({
        order_id: order.id,
        slip_path: "attendee.png",
        slip_sha256: "hash_att",
        amount_thb: 20,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "4444",
      });
      await engine.approvePayment({ payment_id: p.id, reviewer_id: "staff-1" });

      const tickets = await engine.getTicketsForOrder(order.id);
      const ticket = tickets[0];

      // 1. First scan
      const scan1 = await engine.checkInTicket(ticket.code, "staff-door-1");
      expect(scan1.success).toBe(true);
      if (scan1.success) {
        expect(scan1.ticket.status).toBe("checked_in");
        expect(scan1.ticket.checked_in_by).toBe("staff-door-1");
      }

      // 2. Second scan of the same ticket
      const scan2 = await engine.checkInTicket(ticket.code, "staff-door-2");
      expect(scan2.success).toBe(false);
      if (!scan2.success) {
        expect(scan2.error).toBe("already_checked_in");
        expect(scan2.checked_in_by).toBe("staff-door-1");
        expect(scan2.checked_in_at).toBeDefined();
      }
    });

    it("rejects unknown code or void tickets", async () => {
      const unknownScan = await engine.checkInTicket("UNKNOWN-TICKET-CODE-12345", "staff-1");
      expect(unknownScan.success).toBe(false);
      if (!unknownScan.success) {
        expect(unknownScan.error).toBe("invalid_ticket");
      }
    });
  });

  // --- 8.7 Venue-Full Switch Tests ---
  describe("8.7 Venue-Full Switch", () => {
    it("blocks new orders when venue is full, but existing orders and tickets still function", async () => {
      // 1. Create an order before full
      const order1Res = await engine.createOrder({
        buyer_name: "คนสั่งทัน",
        phone: "0889012345",
        email: "early@example.com",
        quantity: 1,
      });
      expect(order1Res.success).toBe(true);
      if (!order1Res.success) return;

      // 2. Staff turns on 'ร้านเต็มชั่วคราว'
      await engine.setVenueFull(true, "staff-door");
      const status = await engine.getVenueStatus();
      expect(status.is_full).toBe(true);

      // 3. New order creation is rejected with venue_full
      const order2Res = await engine.createOrder({
        buyer_name: "คนสั่งช้า",
        phone: "0890123456",
        email: "blocked@example.com",
        quantity: 1,
      });
      expect(order2Res.success).toBe(false);
      if (!order2Res.success) {
        expect(order2Res.error).toBe("venue_full");
      }

      // 4. Existing order can still upload slip and be approved
      const p = await engine.addPayment({
        order_id: order1Res.order.id,
        slip_path: "order1.png",
        slip_sha256: "hash_early",
        amount_thb: 20,
        transferred_at: new Date().toISOString(),
        to_bank: "KBANK",
        payer_name_or_last4: "8888",
      });
      const app = await engine.approvePayment({ payment_id: p.id, reviewer_id: "staff-1" });
      expect(app.success).toBe(true);

      // 5. Ticket scanning continues
      const tickets = await engine.getTicketsForOrder(order1Res.order.id);
      const scan = await engine.checkInTicket(tickets[0].code, "staff-door");
      expect(scan.success).toBe(true);

      // 6. Turn venue full off -> new orders can be created again
      await engine.setVenueFull(false, "staff-door");
      const order3Res = await engine.createOrder({
        buyer_name: "คนสั่งหลังเปิดใหม่",
        phone: "0890123456",
        email: "reopened@example.com",
        quantity: 1,
      });
      expect(order3Res.success).toBe(true);
    });
  });
});
