import { beforeEach, describe, expect, it } from "vitest";
import { OrderEngine } from "@/lib/engine";
import { POST as scanRoute } from "@/app/api/staff/scan/route";

describe("Smart QR Scanner & Scan API (/api/staff/scan)", () => {
  let engine: OrderEngine;

  beforeEach(() => {
    engine = new OrderEngine();
  });

  function makePostRequest(body: unknown) {
    return new Request("https://example.test/api/staff/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("checks in a ticket when scanned with raw 32-hex ticket code", async () => {
    // 1. Create a single-ticket walkup order
    const walkupRes = await engine.createWalkUpOrder({
      buyer_name: "ลูกค้าคนเดียว",
      phone: "0812345678",
      quantity: 1,
      payment_method: "cash_onsite",
      check_in_now_count: 0, // Keep as issued
      staff_id: "staff-1",
    });

    const ticket = walkupRes.tickets[0];
    expect(ticket.status).toBe("issued");

    // Replace global engine with this local engine for testing route
    const { engine: globalEngine } = await import("@/lib/engine");
    globalEngine.tickets.set(ticket.id, { ...ticket });
    globalEngine.orders.set(walkupRes.order.id, { ...walkupRes.order });

    const response = await scanRoute(
      makePostRequest({ ticket_code: ticket.code, staff_id: "gate-1" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.ticket.code).toBe(ticket.code);
    expect(body.message).toContain("เช็กอินสำเร็จ");

    // Verify status updated in engine
    const updated = await globalEngine.getTicketByCode(ticket.code);
    expect(updated?.status).toBe("checked_in");
  });

  it("extracts ticket code from a full URL containing 32-hex ticket hash", async () => {
    const walkupRes = await engine.createWalkUpOrder({
      buyer_name: "ลูกค้าลิงก์ตั๋ว",
      quantity: 1,
      payment_method: "cash_onsite",
      check_in_now_count: 0,
      staff_id: "staff-1",
    });

    const ticket = walkupRes.tickets[0];
    const { engine: globalEngine } = await import("@/lib/engine");
    globalEngine.tickets.set(ticket.id, { ...ticket });
    globalEngine.orders.set(walkupRes.order.id, { ...walkupRes.order });

    const fullUrl = `https://larb-raek-phob-tickets.vercel.app/tickets/${ticket.code}?referrer=line`;
    const response = await scanRoute(
      makePostRequest({ ticket_code: fullUrl, staff_id: "gate-1" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.ticket.code).toBe(ticket.code);
  });

  it("auto-checks in single-ticket order when customer presents Order URL", async () => {
    const walkupRes = await engine.createWalkUpOrder({
      buyer_name: "ลูกค้าเปิดหน้าออเดอร์",
      phone: "0998887777",
      quantity: 1,
      payment_method: "promptpay_onsite",
      check_in_now_count: 0,
      staff_id: "staff-1",
    });

    const order = walkupRes.order;
    const ticket = walkupRes.tickets[0];

    const { engine: globalEngine } = await import("@/lib/engine");
    globalEngine.orders.set(order.id, { ...order });
    globalEngine.tickets.set(ticket.id, { ...ticket });

    const orderUrl = `https://larb-raek-phob-tickets.vercel.app/orders/${order.code}?t=secret123`;
    const response = await scanRoute(
      makePostRequest({ ticket_code: orderUrl, staff_id: "gate-1" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.ticket.order_code).toBe(order.code);
    expect(body.ticket.holder_name).toBe(order.buyer_name);
  });

  it("returns multi-ticket order details when scanning order URL for a multi-ticket purchase", async () => {
    const walkupRes = await engine.createWalkUpOrder({
      buyer_name: "กลุ่มเพื่อน 3 คน",
      phone: "0811112222",
      quantity: 3,
      payment_method: "cash_onsite",
      check_in_now_count: 0,
      staff_id: "staff-1",
    });

    const order = walkupRes.order;
    const { engine: globalEngine } = await import("@/lib/engine");
    globalEngine.orders.set(order.id, { ...order });
    for (const t of walkupRes.tickets) {
      globalEngine.tickets.set(t.id, { ...t });
    }

    const orderUrl = `https://larb-raek-phob-tickets.vercel.app/orders/${order.code}`;
    const response = await scanRoute(
      makePostRequest({ ticket_code: orderUrl, staff_id: "gate-1" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.is_order).toBe(true);
    expect(body.tickets.length).toBe(3);
    expect(body.issued_count).toBe(3);
    expect(body.checked_in_count).toBe(0);
  });

  it("checks in all remaining tickets for an order with action check_in_all", async () => {
    const walkupRes = await engine.createWalkUpOrder({
      buyer_name: "กลุ่มเหมาบัตร",
      quantity: 3,
      payment_method: "cash_onsite",
      check_in_now_count: 1, // 1 already checked in, 2 remaining
      staff_id: "staff-1",
    });

    const order = walkupRes.order;
    const { engine: globalEngine } = await import("@/lib/engine");
    globalEngine.orders.set(order.id, { ...order });
    for (const t of walkupRes.tickets) {
      globalEngine.tickets.set(t.id, { ...t });
    }

    const response = await scanRoute(
      makePostRequest({
        action: "check_in_all",
        order_id: order.id,
        staff_id: "gate-1",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.checked_in_count).toBe(2);
    expect(body.tickets.every((t: any) => t.status === "checked_in")).toBe(true);
  });

  it("returns 409 already_checked_in when scanning an already checked-in ticket", async () => {
    const walkupRes = await engine.createWalkUpOrder({
      buyer_name: "ลูกค้าเช็กอินแล้ว",
      quantity: 1,
      payment_method: "cash_onsite",
      check_in_now_count: 1, // already checked in
      staff_id: "staff-1",
    });

    const ticket = walkupRes.tickets[0];
    const { engine: globalEngine } = await import("@/lib/engine");
    globalEngine.tickets.set(ticket.id, { ...ticket });
    globalEngine.orders.set(walkupRes.order.id, { ...walkupRes.order });

    const response = await scanRoute(
      makePostRequest({ ticket_code: ticket.code, staff_id: "gate-1" })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("already_checked_in");
  });

  it("returns 404 invalid_ticket when code is completely unknown", async () => {
    const response = await scanRoute(
      makePostRequest({ ticket_code: "TOTALLY-INVALID-123", staff_id: "gate-1" })
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("invalid_ticket");
  });
});
