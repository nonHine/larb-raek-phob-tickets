import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ tickets: [] });
    }

    const resultsMap = new Map<string, any>();

    // 1. Search matching orders (by buyer name, phone, code, email)
    const matchingOrders = await engine.searchOrders(q);
    for (const order of matchingOrders) {
      const tickets = await engine.getTicketsForOrder(order.id);
      for (const ticket of tickets) {
        if (!resultsMap.has(ticket.id)) {
          resultsMap.set(ticket.id, {
            ticket_id: ticket.id,
            ticket_code: ticket.code,
            holder_name: ticket.holder_name || order.buyer_name,
            ticket_status: ticket.status,
            checked_in_at: ticket.checked_in_at,
            order_code: order.code,
            buyer_name: order.buyer_name,
            phone: order.phone,
            order_status: order.status,
          });
        }
      }
    }

    // 2. Search matching tickets directly (by ticket code or holder name)
    const matchingTickets = await engine.searchTickets(q);
    for (const ticket of matchingTickets) {
      if (!resultsMap.has(ticket.id)) {
        const order = await engine.getOrderById(ticket.order_id);
        if (order) {
          resultsMap.set(ticket.id, {
            ticket_id: ticket.id,
            ticket_code: ticket.code,
            holder_name: ticket.holder_name || order.buyer_name,
            ticket_status: ticket.status,
            checked_in_at: ticket.checked_in_at,
            order_code: order.code,
            buyer_name: order.buyer_name,
            phone: order.phone,
            order_status: order.status,
          });
        }
      }
    }

    const results = Array.from(resultsMap.values());

    return NextResponse.json({
      success: true,
      count: results.length,
      tickets: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to search tickets" },
      { status: 500 }
    );
  }
}
