import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase().trim();

    if (!q) {
      return NextResponse.json({ tickets: [] });
    }

    const results: any[] = [];

    for (const ticket of engine.tickets.values()) {
      const order = await engine.getOrderById(ticket.order_id);
      if (!order) continue;

      const match =
        ticket.code.toLowerCase().includes(q) ||
        order.code.toLowerCase().includes(q) ||
        order.buyer_name.toLowerCase().includes(q) ||
        order.phone.includes(q);

      if (match) {
        results.push({
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

    return NextResponse.json({
      success: true,
      tickets: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to search tickets" },
      { status: 500 }
    );
  }
}
