import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase().trim();
    const status = searchParams.get("status") || "all";

    const allOrders: any[] = [];

    for (const order of engine.orders.values()) {
      // Status filter
      if (status !== "all" && order.status !== status) {
        continue;
      }

      // Query filter
      if (q) {
        const match =
          order.code.toLowerCase().includes(q) ||
          order.buyer_name.toLowerCase().includes(q) ||
          order.phone.includes(q) ||
          order.email.toLowerCase().includes(q);
        if (!match) continue;
      }

      const payments = await engine.getPaymentsForOrder(order.id);
      const tickets = await engine.getTicketsForOrder(order.id);
      const approvedAmount = payments
        .filter((p) => p.status === "approved")
        .reduce((sum, p) => sum + Number(p.amount_thb), 0);

      allOrders.push({
        id: order.id,
        code: order.code,
        access_token: order.access_token,
        buyer_name: order.buyer_name,
        phone: order.phone,
        email: order.email,
        quantity: order.quantity,
        total_thb: order.total_thb,
        status: order.status,
        approved_amount: approvedAmount,
        remaining_amount: Math.max(0, order.total_thb - approvedAmount),
        admin_note: order.admin_note,
        created_at: order.created_at,
        payments_count: payments.length,
        tickets_count: tickets.length,
        tickets_checked_in: tickets.filter((t) => t.status === "checked_in").length,
      });
    }

    // Sort newest first
    allOrders.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      orders: allOrders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, order_id, ticket_code, note, reason, staff_id } = body;

    const actor = staff_id || "staff-admin";

    if (action === "cancel") {
      if (!order_id) {
        return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
      }
      const order = await engine.cancelOrder(order_id, actor, reason);
      return NextResponse.json({ success: true, order });
    }

    if (action === "revert_scan") {
      if (!ticket_code) {
        return NextResponse.json({ error: "Missing ticket_code" }, { status: 400 });
      }
      const ticket = await engine.revertTicketScan(ticket_code, actor);
      return NextResponse.json({ success: true, ticket });
    }

    if (action === "note") {
      const order = await engine.getOrderById(order_id);
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      order.admin_note = note;
      engine.orders.set(order.id, order);
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed action" },
      { status: 500 }
    );
  }
}
