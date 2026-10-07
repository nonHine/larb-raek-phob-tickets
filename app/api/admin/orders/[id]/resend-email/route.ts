import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";
import { sendEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    let order = await engine.getOrderById(orderId);
    if (!order) {
      order = await engine.getOrderByCode(orderId);
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.email || order.email.includes("walkup-") || !order.email.includes("@")) {
      return NextResponse.json(
        { error: "Order does not have a valid customer email address" },
        { status: 400 }
      );
    }

    const tickets = await engine.getTicketsForOrder(order.id);

    const emailResult = await sendEmail({
      to: order.email,
      subject: `บัตรเข้างานลาบแรกพบ ครั้งที่ 2 - ออเดอร์ #${order.code}`,
      template: order.status === "paid" ? "paid" : "order_created",
      data: {
        buyer_name: order.buyer_name,
        order_code: order.code,
        access_token: order.access_token,
        quantity: order.quantity,
        tickets: tickets.length > 0 ? tickets : undefined,
      },
    });

    if (engine.isSupabaseReady()) {
      try {
        await supabaseAdmin.from("audit_log").insert({
          action: "ticket_email_resent",
          actor: "00000000-0000-0000-0000-000000000001",
          entity: "order",
          entity_id: order.id,
          meta: {
            to: order.email,
            email_result: emailResult,
            sent_at: new Date().toISOString(),
          },
        });
      } catch {
        // keep
      }
    }

    return NextResponse.json({
      success: emailResult.ok,
      result: emailResult,
      message: emailResult.ok
        ? `ส่งอีเมลไปยัง ${order.email} เรียบร้อยแล้ว`
        : `ส่งไม่สำเร็จ: ${emailResult.error || emailResult.status}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to resend email" },
      { status: 500 }
    );
  }
}
