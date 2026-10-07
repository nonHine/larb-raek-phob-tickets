import { describe, it, expect, beforeEach } from "vitest";
import { checkPin } from "@/lib/auth";
import { engine } from "@/lib/engine";

describe("Admin PIN 3011 and Customer Detail Editing", () => {
  beforeEach(() => {
    engine.reset();
  });

  describe("1. Security PIN Verification", () => {
    it("authenticates admin role using new PIN 3011", () => {
      const res = checkPin("3011");
      expect(res.valid).toBe(true);
      expect(res.role).toBe("admin");
    });

    it("rejects previous admin PIN 8899", () => {
      const res = checkPin("8899");
      expect(res.valid).toBe(false);
      expect(res.role).toBeUndefined();
    });

    it("maintains scanner PIN 1122 for gate staff", () => {
      const res = checkPin("1122");
      expect(res.valid).toBe(true);
      expect(res.role).toBe("scanner");
    });
  });

  describe("2. Customer Detail View & Updates", () => {
    it("updates buyer name, phone, email, and admin note successfully", async () => {
      const createRes = await engine.createOrder({
        buyer_name: "นายสมชาย ตั้งต้น",
        phone: "0812345678",
        email: "somchai@example.com",
        quantity: 2,
      });

      expect(createRes.success).toBe(true);
      if (!createRes.success) return;

      const order = createRes.order;

      // Update customer details
      const updated = await engine.updateCustomerDetails(
        order.id,
        {
          buyer_name: "นายสมชาย ใจดี (แก้ไข)",
          phone: "0899999999",
          email: "somchai.new@example.com",
          admin_note: "ลูกค้าติดต่อขอเปลี่ยนอีเมลหน้าร้าน",
        },
        "staff-admin-3011"
      );

      expect(updated).not.toBeNull();
      expect(updated?.buyer_name).toBe("นายสมชาย ใจดี (แก้ไข)");
      expect(updated?.phone).toBe("0899999999");
      expect(updated?.email).toBe("somchai.new@example.com");
      expect(updated?.admin_note).toBe("ลูกค้าติดต่อขอเปลี่ยนอีเมลหน้าร้าน");

      // Verify fetching back
      const fetched = await engine.getOrderById(order.id);
      expect(fetched?.buyer_name).toBe("นายสมชาย ใจดี (แก้ไข)");
      expect(fetched?.phone).toBe("0899999999");
      expect(fetched?.email).toBe("somchai.new@example.com");
      expect(fetched?.admin_note).toBe("ลูกค้าติดต่อขอเปลี่ยนอีเมลหน้าร้าน");
    });

    it("can look up and update using order code instead of uuid", async () => {
      const createRes = await engine.createOrder({
        buyer_name: "ลูกค้า รหัสออเดอร์",
        phone: "0823456789",
        email: "code@example.com",
        quantity: 1,
      });

      expect(createRes.success).toBe(true);
      if (!createRes.success) return;

      const order = createRes.order;

      const updated = await engine.updateCustomerDetails(
        order.code,
        {
          buyer_name: "ลูกค้า รหัสออเดอร์ (อัปเดตผ่านโค้ด)",
        },
        "staff-admin"
      );

      expect(updated).not.toBeNull();
      expect(updated?.buyer_name).toBe("ลูกค้า รหัสออเดอร์ (อัปเดตผ่านโค้ด)");
    });
  });

  describe("3. Enhanced Dashboard Metrics & Activities", () => {
    it("computes check_in_rate_percent, online vs onsite breakdown, and recent_activities", async () => {
      // Create 1 online order (paid)
      const order1 = await engine.createOrder({
        buyer_name: "ลูกค้า ออนไลน์ 1",
        phone: "0811111111",
        email: "online1@example.com",
        quantity: 2,
      });
      if (!order1.success) throw new Error("Order creation failed");

      const payment = await engine.addPayment({
        order_id: order1.order.id,
        slip_path: "slips/slip1.jpg",
        slip_sha256: "hash1",
        amount_thb: 98,
        transferred_at: new Date().toISOString(),
        to_bank: "กสิกรไทย",
        payer_name_or_last4: "ลูกค้า ออนไลน์ 1",
      });
      await engine.approvePayment({
        payment_id: payment.id,
        reviewer_id: "admin-1",
      });

      // Check-in 1 ticket out of 2
      const tickets = await engine.getTicketsForOrder(order1.order.id);
      expect(tickets.length).toBe(2);
      await engine.checkInTicket(tickets[0].code, "scanner-door");

      // Create 1 walk-up order (cash 1 ticket)
      await engine.createWalkUpOrder({
        buyer_name: "ลูกค้า หน้างาน เงินสด",
        phone: "0822222222",
        quantity: 1,
        payment_method: "cash_onsite",
        check_in_now_count: 1,
        staff_id: "staff-pos",
      });

      const stats = await engine.getDashboardStats();

      // Check-in rate: 2 checked in out of 3 issued = 66.7%
      expect(stats.tickets_issued).toBe(3);
      expect(stats.tickets_checked_in).toBe(2);
      expect(stats.check_in_rate_percent).toBeCloseTo(66.7, 1);

      // Online vs onsite revenue breakdown
      expect(stats.confirmed_revenue_thb).toBe(147); // 98 + 49
      expect(stats.onsite_cash_thb).toBe(49);
      expect(stats.online_revenue_thb).toBe(98);
      expect(stats.onsite_tickets_count).toBe(1);
      expect(stats.online_tickets_count).toBe(2);

      // Recent activities
      expect(stats.recent_activities).toBeDefined();
      expect(stats.recent_activities?.length).toBeGreaterThanOrEqual(2);
      expect(stats.recent_activities?.[0].buyer_name).toBe("ลูกค้า หน้างาน เงินสด");
    });
  });
});
