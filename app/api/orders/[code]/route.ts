import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("t");
    const code = params.code;

    if (!code || !token) {
      return NextResponse.json(
        { error: "not_found", message: "ไม่พบคำสั่งซื้อ" },
        { status: 404 }
      );
    }

    const order = await engine.getOrderByCode(code, token);
    if (!order) {
      return NextResponse.json(
        { error: "not_found", message: "ไม่พบคำสั่งซื้อ" },
        { status: 404 }
      );
    }

    const payments = await engine.getPaymentsForOrder(order.id);
    const approvedAmount = payments
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount_thb), 0);

    const pendingAmount = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount_thb), 0);

    const remainingAmount = Math.max(0, order.total_thb - approvedAmount);

    let tickets: any[] = [];
    if (order.status === "paid") {
      tickets = await engine.getTicketsForOrder(order.id);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        buyer_name: order.buyer_name,
        phone: order.phone,
        email: order.email,
        quantity: order.quantity,
        unit_price_thb: order.unit_price_thb,
        total_thb: order.total_thb,
        status: order.status,
        expires_at: order.expires_at,
        created_at: order.created_at,
        approved_amount: approvedAmount,
        pending_amount: pendingAmount,
        remaining_amount: remainingAmount,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount_thb: p.amount_thb,
        to_bank: p.to_bank,
        payer_name_or_last4: p.payer_name_or_last4,
        transferred_at: p.transferred_at,
        status: p.status,
        reject_reason: p.reject_reason,
        created_at: p.created_at,
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        code: t.code,
        holder_name: t.holder_name,
        status: t.status,
        checked_in_at: t.checked_in_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve order" },
      { status: 500 }
    );
  }
}
