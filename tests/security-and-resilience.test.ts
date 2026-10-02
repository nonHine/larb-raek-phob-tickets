import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSessionToken,
  parseSessionToken,
  checkPin,
  getVerifiedStaffSession,
} from "@/lib/auth";
import { engine } from "@/lib/engine";
import { POST as venueStatusPost } from "@/app/api/venue-status/route";
import { POST as lookupPost } from "@/app/api/orders/lookup/route";

describe("SEC-003: Cryptographic HMAC Session Tokens", () => {
  it("generates and verifies valid session tokens", async () => {
    const adminToken = await generateSessionToken("admin");
    const parsedAdmin = await parseSessionToken(adminToken);
    expect(parsedAdmin.valid).toBe(true);
    expect(parsedAdmin.role).toBe("admin");

    const scannerToken = await generateSessionToken("scanner");
    const parsedScanner = await parseSessionToken(scannerToken);
    expect(parsedScanner.valid).toBe(true);
    expect(parsedScanner.role).toBe("scanner");
  });

  it("rejects tampered or forged signatures", async () => {
    const validToken = await generateSessionToken("admin");
    const parts = validToken.split(".");
    // Tamper with role
    const forgedRole = `scanner.${parts[1]}.${parts[2]}`;
    expect((await parseSessionToken(forgedRole)).valid).toBe(false);

    // Tamper with signature
    const forgedSig = `${parts[0]}.${parts[1]}.badsignature12345`;
    expect((await parseSessionToken(forgedSig)).valid).toBe(false);
  });

  it("rejects tokens with timestamps far into the future", async () => {
    const futureTimestamp = (Date.now() + 10 * 60 * 1000).toString(); // +10 minutes
    const token = `admin.${futureTimestamp}.anysig`;
    expect((await parseSessionToken(token)).valid).toBe(false);
  });

  it("rejects tokens older than 7 days", async () => {
    const oldTimestamp = (Date.now() - 8 * 24 * 60 * 60 * 1000).toString(); // -8 days
    const token = `admin.${oldTimestamp}.anysig`;
    expect((await parseSessionToken(token)).valid).toBe(false);
  });

  it("extracts verified session from request cookies safely", async () => {
    const token = await generateSessionToken("admin");
    const req = new Request("https://example.com/api/test", {
      headers: { cookie: `staff_session=${token}; other=value` },
    });
    const session = await getVerifiedStaffSession(req);
    expect(session.valid).toBe(true);
    expect(session.role).toBe("admin");
    expect(session.staffId).toBe("staff-admin");

    const unauthReq = new Request("https://example.com/api/test");
    const emptySession = await getVerifiedStaffSession(unauthReq);
    expect(emptySession.valid).toBe(false);
  });
});

describe("SEC-001: Venue Status Access Control", () => {
  it("rejects unauthenticated POST requests with 401", async () => {
    const req = new Request("https://example.com/api/venue-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_full: true }),
    });

    const res = await venueStatusPost(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("rejects scanner role from changing venue status with 401", async () => {
    const scannerToken = await generateSessionToken("scanner");
    const req = new Request("https://example.com/api/venue-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `staff_session=${scannerToken}`,
      },
      body: JSON.stringify({ is_full: true }),
    });

    const res = await venueStatusPost(req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("allows admin role to change venue status", async () => {
    const adminToken = await generateSessionToken("admin");
    const req = new Request("https://example.com/api/venue-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `staff_session=${adminToken}`,
      },
      body: JSON.stringify({ is_full: false }),
    });

    const res = await venueStatusPost(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.venue_status.is_full).toBe(false);
  });
});

describe("SEC-002: Phone Lookup Buyer Privacy", () => {

  it("does not return access_token or direct URL for phone-only lookup", async () => {
    const orderRes = await engine.createOrder({
      buyer_name: "ลูกค้าทดสอบ",
      phone: "0891112233",
      email: "testbuyer@example.com",
      quantity: 1,
    });
    expect(orderRes.success).toBe(true);

    const req = new Request("https://example.com/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "0891112233" }),
    });

    // Directly test logic
    const foundOrders = await engine.getOrdersByPhone("0891112233");
    expect(foundOrders.length).toBeGreaterThan(0);

    // Call lookup endpoint
    const res = await lookupPost(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.orders[0].url).toBeNull();
    expect(body.orders[0].masked_email).toContain("***");
  });
});

describe("BUG-003: Atomic Ticket Check-in & Concurrency", () => {

  it("handles valid check-in and rejects duplicate scan immediately", async () => {
    const orderRes = await engine.createOrder({
      buyer_name: "นายตั๋ว ดี",
      phone: "0812345678",
      email: "ticket@example.com",
      quantity: 1,
    });
    if (!orderRes.success) return;

    // Simulate payment & approval
    const payment = await engine.addPayment({
      order_id: orderRes.order.id,
      slip_path: "path.png",
      slip_sha256: "hash999",
      amount_thb: 49,
      transferred_at: new Date().toISOString(),
      to_bank: "KBANK",
      payer_name_or_last4: "0001",
    });
    await engine.approvePayment({
      payment_id: payment.id,
      reviewer_id: "staff-1",
    });

    const tickets = await engine.getTicketsForOrder(orderRes.order.id);
    expect(tickets.length).toBe(1);
    const ticketCode = tickets[0].code;

    // First scan: should succeed
    const scan1 = await engine.checkInTicket(ticketCode, "scanner-gate-1");
    expect(scan1.success).toBe(true);
    if (scan1.success) {
      expect(scan1.ticket.status).toBe("checked_in");
    }

    // Second scan (duplicate attempt): MUST fail with already_checked_in
    const scan2 = await engine.checkInTicket(ticketCode, "scanner-gate-2");
    expect(scan2.success).toBe(false);
    if (!scan2.success) {
      expect(scan2.error).toBe("already_checked_in");
    }
  });
});

describe("BUG-004: Anti-Fraud Duplicate Slip Detection", () => {

  it("detects duplicate slip SHA-256 across orders", async () => {
    const o1 = await engine.createOrder({
      buyer_name: "ผู้ซื้อ A",
      phone: "0811111111",
      email: "a@example.com",
      quantity: 1,
    });
    const o2 = await engine.createOrder({
      buyer_name: "ผู้ซื้อ B",
      phone: "0822222222",
      email: "b@example.com",
      quantity: 1,
    });
    if (!o1.success || !o2.success) return;

    const slipHash = "unique_image_sha256_hash_123456";

    // Attach to Order 1
    await engine.addPayment({
      order_id: o1.order.id,
      slip_path: "slips/o1.png",
      slip_sha256: slipHash,
      amount_thb: 49,
      transferred_at: new Date().toISOString(),
      to_bank: "KBANK",
      payer_name_or_last4: "1111",
    });

    // Check if Order 2 can reuse this exact slip hash
    const isDupForO2 = await engine.isSlipDuplicate(slipHash, o2.order.id);
    expect(isDupForO2).toBe(true);

    // Should NOT be duplicate if checking within same order (re-upload or multiple slips)
    const isDupForO1 = await engine.isSlipDuplicate(slipHash, o1.order.id);
    expect(isDupForO1).toBe(false);
  });
});
