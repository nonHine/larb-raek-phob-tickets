import { describe, it, expect, beforeEach } from "vitest";
import { OrderEngine } from "@/lib/engine";
import { EVENT } from "@/config/event.config";
import { POST as walkUpRoute } from "@/app/api/staff/walk-up/route";
import { generateSessionToken } from "@/lib/auth";

describe("Walk-up Ticket Sales (Backend Engine & API)", () => {
  let engine: OrderEngine;

  beforeEach(() => {
    engine = new OrderEngine();
  });

  // --- Requirement 1: Cash onsite with full immediate check-in ---
  describe("1. Cash onsite order with full immediate check-in", () => {
    it("creates a paid order, approved payment, and all tickets checked-in immediately", async () => {
      const quantity = 3;
      const expectedTotal = quantity * EVENT.ticketPriceThb; // 3 * 49 = 147

      const res = await engine.createWalkUpOrder({
        buyer_name: "นายสมชาย หน้าร้าน",
        phone: "0812345678",
        quantity,
        payment_method: "cash_onsite",
        check_in_now_count: quantity,
        staff_id: "staff-gate-1",
      });

      expect(res.success).toBe(true);

      // Verify Order
      const order = res.order;
      expect(order.status).toBe("paid");
      expect(order.buyer_name).toBe("นายสมชาย หน้าร้าน");
      expect(order.phone).toBe("0812345678");
      expect(order.quantity).toBe(quantity);
      expect(order.total_thb).toBe(expectedTotal);
      expect(order.unit_price_thb).toBe(EVENT.ticketPriceThb);
      expect(order.email).toBe(`walkup-${order.code.toLowerCase()}@larbraekphob.local`);
      expect(order.expires_at).toBeNull();
      expect(order.access_token).toBeDefined();

      // Verify Payment
      const payment = res.payment;
      expect(payment.order_id).toBe(order.id);
      expect(payment.status).toBe("approved");
      expect(payment.amount_thb).toBe(expectedTotal);
      expect(payment.to_bank).toBe("เงินสดหน้าร้าน");
      expect(payment.payer_name_or_last4).toBe("นายสมชาย หน้าร้าน");
      expect(payment.reviewed_by).toBe("staff-gate-1");
      expect(payment.reviewed_at).toBeDefined();
      expect(payment.approved_at).toBeDefined();

      // Verify Tickets (all checked-in)
      expect(res.tickets.length).toBe(quantity);
      for (let i = 0; i < quantity; i++) {
        const ticket = res.tickets[i];
        expect(ticket.order_id).toBe(order.id);
        expect(ticket.holder_name).toBe("นายสมชาย หน้าร้าน");
        expect(ticket.status).toBe("checked_in");
        expect(ticket.checked_in_at).toBeDefined();
        expect(ticket.checked_in_by).toBe("staff-gate-1");
        expect(ticket.code.length).toBeGreaterThanOrEqual(16);
      }

      // Verify Audit Log
      expect(engine.auditLogs.length).toBe(1);
      const log = engine.auditLogs[0];
      expect(log.action).toBe("walkup_ticket_sale");
      expect(log.actor).toBe("staff-gate-1");
      expect(log.entity).toBe("order");
      expect(log.entity_id).toBe(order.id);
      expect(log.meta).toEqual({
        quantity: 3,
        total_thb: expectedTotal,
        payment_method: "cash_onsite",
        check_in_now_count: 3,
      });

      // Verify lookup from engine maps
      const fetchedOrder = await engine.getOrderById(order.id);
      expect(fetchedOrder).toEqual(order);

      const fetchedTickets = await engine.getTicketsForOrder(order.id);
      expect(fetchedTickets.length).toBe(quantity);

      const fetchedPayments = await engine.getPaymentsForOrder(order.id);
      expect(fetchedPayments.length).toBe(1);
      expect(fetchedPayments[0].id).toBe(payment.id);
    });

    it("defaults check_in_now_count to quantity when omitted", async () => {
      const res = await engine.createWalkUpOrder({
        buyer_name: "มานะ มานี",
        quantity: 2,
        payment_method: "cash_onsite",
      });

      expect(res.success).toBe(true);
      expect(res.tickets.length).toBe(2);
      expect(res.tickets[0].status).toBe("checked_in");
      expect(res.tickets[1].status).toBe("checked_in");
      expect(res.payment.reviewed_by).toBe("staff_door"); // default staff
    });
  });

  // --- Requirement 2: PromptPay onsite with partial check-in ---
  describe("2. PromptPay onsite with partial check-in", () => {
    it("creates order for 2 tickets, checks in 1 immediately, and leaves 1 as issued", async () => {
      const quantity = 2;
      const checkInNowCount = 1;
      const expectedTotal = quantity * EVENT.ticketPriceThb; // 2 * 49 = 98

      const res = await engine.createWalkUpOrder({
        buyer_name: "นางสาวสมรักษ์ พรหมดี",
        phone: "0898765432",
        quantity,
        payment_method: "promptpay_onsite",
        check_in_now_count: checkInNowCount,
        staff_id: "staff-gate-2",
      });

      expect(res.success).toBe(true);

      // Verify Payment
      const payment = res.payment;
      expect(payment.status).toBe("approved");
      expect(payment.amount_thb).toBe(expectedTotal);
      expect(payment.to_bank).toBe("พร้อมเพย์หน้าร้าน");
      expect(payment.payer_name_or_last4).toBe("นางสาวสมรักษ์ พรหมดี");
      expect(payment.reviewed_by).toBe("staff-gate-2");

      // Verify Tickets
      expect(res.tickets.length).toBe(2);

      // Ticket 0: checked_in
      const ticket1 = res.tickets[0];
      expect(ticket1.status).toBe("checked_in");
      expect(ticket1.checked_in_at).not.toBeNull();
      expect(ticket1.checked_in_by).toBe("staff-gate-2");

      // Ticket 1: issued (not yet checked in)
      const ticket2 = res.tickets[1];
      expect(ticket2.status).toBe("issued");
      expect(ticket2.checked_in_at).toBeNull();
      expect(ticket2.checked_in_by).toBeNull();

      // Verify second ticket can be scanned later by door staff
      const scanRes = await engine.checkInTicket(ticket2.code, "staff-gate-late");
      expect(scanRes.success).toBe(true);
      if (scanRes.success) {
        expect(scanRes.ticket.status).toBe("checked_in");
        expect(scanRes.ticket.checked_in_by).toBe("staff-gate-late");
      }

      // Attempting to scan again should fail with already_checked_in
      const rescanRes = await engine.checkInTicket(ticket2.code, "staff-gate-late");
      expect(rescanRes.success).toBe(false);
      if (!rescanRes.success) {
        expect(rescanRes.error).toBe("already_checked_in");
      }
    });

    it("supports check_in_now_count = 0 leaving all tickets issued", async () => {
      const res = await engine.createWalkUpOrder({
        buyer_name: "ลูกค้าซื้อฝากเพื่อน",
        quantity: 2,
        payment_method: "promptpay_onsite",
        check_in_now_count: 0,
        staff_id: "staff-gate-1",
      });

      expect(res.success).toBe(true);
      expect(res.tickets[0].status).toBe("issued");
      expect(res.tickets[1].status).toBe("issued");
      expect(res.tickets[0].checked_in_at).toBeNull();
      expect(res.tickets[1].checked_in_at).toBeNull();
    });
  });

  // --- Requirement 3: Optional phone handling ---
  describe("3. Missing or null phone handling", () => {
    it("sets phone to '-' when phone is undefined", async () => {
      const res = await engine.createWalkUpOrder({
        buyer_name: "ลูกค้าไม่สะดวกให้เบอร์",
        quantity: 1,
        payment_method: "cash_onsite",
        phone: undefined,
      });

      expect(res.success).toBe(true);
      expect(res.order.phone).toBe("-");
    });

    it("sets phone to '-' when phone is null", async () => {
      const res = await engine.createWalkUpOrder({
        buyer_name: "ลูกค้าไม่ระบุเบอร์",
        quantity: 1,
        payment_method: "cash_onsite",
        phone: null,
      });

      expect(res.success).toBe(true);
      expect(res.order.phone).toBe("-");
    });

    it("sets phone to '-' when phone is an empty string or whitespace only", async () => {
      const res = await engine.createWalkUpOrder({
        buyer_name: "ลูกค้าช่องว่าง",
        quantity: 1,
        payment_method: "promptpay_onsite",
        phone: "   ",
      });

      expect(res.success).toBe(true);
      expect(res.order.phone).toBe("-");
    });
  });

  // --- Validation & defaults ---
  describe("4. Edge cases & input validation", () => {
    it("sets buyer_name to default 'ลูกค้าหน้างาน' when empty or whitespace", async () => {
      const res1 = await engine.createWalkUpOrder({
        buyer_name: "",
        quantity: 1,
        payment_method: "cash_onsite",
      });
      expect(res1.order.buyer_name).toBe("ลูกค้าหน้างาน");
      expect(res1.payment.payer_name_or_last4).toBe("ลูกค้าหน้างาน");
      expect(res1.tickets[0].holder_name).toBe("ลูกค้าหน้างาน");

      const res2 = await engine.createWalkUpOrder({
        buyer_name: "   ",
        quantity: 1,
        payment_method: "cash_onsite",
      });
      expect(res2.order.buyer_name).toBe("ลูกค้าหน้างาน");
    });

    it("throws error when quantity is less than 1 or invalid", async () => {
      await expect(
        engine.createWalkUpOrder({
          buyer_name: "ลูกค้า",
          quantity: 0,
          payment_method: "cash_onsite",
        })
      ).rejects.toThrow("invalid_quantity");

      await expect(
        engine.createWalkUpOrder({
          buyer_name: "ลูกค้า",
          quantity: -2,
          payment_method: "cash_onsite",
        })
      ).rejects.toThrow("invalid_quantity");
    });

    it("throws error when payment_method is invalid", async () => {
      await expect(
        engine.createWalkUpOrder({
          buyer_name: "ลูกค้า",
          quantity: 1,
          payment_method: "credit_card" as any,
        })
      ).rejects.toThrow("invalid_payment_method");
    });
  });

  // --- Requirement 2 (API Route): POST /api/staff/walk-up ---
  describe("5. API Route: POST /api/staff/walk-up", () => {
    it("returns 401 unauthorized when staff_session cookie is missing", async () => {
      const req = new Request("http://localhost:3000/api/staff/walk-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: "ทดสอบ",
          quantity: 1,
          payment_method: "cash_onsite",
        }),
      });

      const response = await walkUpRoute(req);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe("unauthorized");
    });

    it("returns 401 unauthorized when staff_session cookie is invalid", async () => {
      const req = new Request("http://localhost:3000/api/staff/walk-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "staff_session=invalid.token.signature",
        },
        body: JSON.stringify({
          buyer_name: "ทดสอบ",
          quantity: 1,
          payment_method: "cash_onsite",
        }),
      });

      const response = await walkUpRoute(req);
      expect(response.status).toBe(401);
    });

    it("returns 400 when quantity is invalid", async () => {
      const sessionToken = await generateSessionToken("scanner");
      const req = new Request("http://localhost:3000/api/staff/walk-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `staff_session=${sessionToken}`,
        },
        body: JSON.stringify({
          buyer_name: "ทดสอบ",
          quantity: 0,
          payment_method: "cash_onsite",
        }),
      });

      const response = await walkUpRoute(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("invalid_quantity");
    });

    it("returns 400 when payment_method is invalid", async () => {
      const sessionToken = await generateSessionToken("scanner");
      const req = new Request("http://localhost:3000/api/staff/walk-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `staff_session=${sessionToken}`,
        },
        body: JSON.stringify({
          buyer_name: "ทดสอบ",
          quantity: 1,
          payment_method: "unknown_method",
        }),
      });

      const response = await walkUpRoute(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("invalid_payment_method");
    });

    it("successfully creates walk-up order with 200 OK when authenticated", async () => {
      const sessionToken = await generateSessionToken("scanner");
      const req = new Request("http://localhost:3000/api/staff/walk-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `staff_session=${sessionToken}`,
        },
        body: JSON.stringify({
          buyer_name: "ลูกค้าผ่าน API",
          phone: "0891112233",
          quantity: 2,
          payment_method: "promptpay_onsite",
          check_in_now_count: 1,
        }),
      });

      const response = await walkUpRoute(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.order).toBeDefined();
      expect(json.order.status).toBe("paid");
      expect(json.order.total_thb).toBe(98);
      expect(json.payment).toBeDefined();
      expect(json.payment.to_bank).toBe("พร้อมเพย์หน้าร้าน");
      expect(json.tickets).toHaveLength(2);
      expect(json.tickets[0].status).toBe("checked_in");
      expect(json.tickets[1].status).toBe("issued");
    });

    it("accepts 'cash' and 'promptpay' shorthand payment_method aliases from frontend", async () => {
      const sessionToken = await generateSessionToken("admin");
      const req = new Request("http://localhost:3000/api/staff/walk-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `staff_session=${sessionToken}`,
        },
        body: JSON.stringify({
          buyer_name: "ลูกค้าเงินสดเร็ว",
          quantity: 1,
          payment_method: "cash",
        }),
      });

      const response = await walkUpRoute(req);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.payment.to_bank).toBe("เงินสดหน้าร้าน");
    });
  });

  // --- Requirement 6: Dashboard Reconciliation (Cash & PromptPay) ---
  describe("6. On-site POS Dashboard Reconciliation (getDashboardStats)", () => {
    it("correctly reconciles onsite cash, promptpay, and ticket counts in in-memory mode", async () => {
      // 1. Initial state
      let stats = await engine.getDashboardStats();
      expect(stats.onsite_cash_thb).toBe(0);
      expect(stats.onsite_promptpay_thb).toBe(0);
      expect(stats.onsite_tickets_count).toBe(0);

      // 2. Add an online order with normal bank transfer
      const orderRes = await engine.createOrder({
        buyer_name: "ผู้ซื้อออนไลน์",
        phone: "0811111111",
        email: "online@example.com",
        quantity: 2,
      });
      if (!orderRes.success) throw new Error("Failed to create order");
      const onlineOrder = orderRes.order;

      const payment = await engine.addPayment({
        order_id: onlineOrder.id,
        slip_path: "slips/online.jpg",
        slip_sha256: "dummy-hash-1",
        amount_thb: 98,
        transferred_at: new Date().toISOString(),
        to_bank: "ธนาคารกสิกรไทย",
        payer_name_or_last4: "ผู้ซื้อออนไลน์",
      });
      await engine.approvePayment({
        payment_id: payment.id,
        reviewer_id: "admin-1",
      });

      // 3. Add walk-up cash orders (2 tickets = 98 THB)
      await engine.createWalkUpOrder({
        buyer_name: "ลูกค้าเงินสด 1",
        phone: "0822222222",
        quantity: 2,
        payment_method: "cash_onsite",
        check_in_now_count: 2,
        staff_id: "staff-pos",
      });

      // 4. Add walk-up promptpay orders (3 tickets = 147 THB)
      await engine.createWalkUpOrder({
        buyer_name: "ลูกค้าพร้อมเพย์ 1",
        phone: "0833333333",
        quantity: 3,
        payment_method: "promptpay_onsite",
        check_in_now_count: 1,
        staff_id: "staff-pos",
      });

      // 5. Query dashboard stats
      stats = await engine.getDashboardStats();

      // Total confirmed revenue = 98 (online) + 98 (cash onsite) + 147 (promptpay onsite) = 343 THB
      expect(stats.confirmed_revenue_thb).toBe(343);

      // On-site cash breakdown
      expect(stats.onsite_cash_thb).toBe(98);

      // On-site promptpay breakdown
      expect(stats.onsite_promptpay_thb).toBe(147);

      // On-site tickets count = (98 + 147) / 49 = 5 tickets
      expect(stats.onsite_tickets_count).toBe(5);
    });
  });
});
