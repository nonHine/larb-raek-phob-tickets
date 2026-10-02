import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { reviewer_id, corrected_amount } = body;

    const res = await engine.approvePayment({
      payment_id: params.id,
      reviewer_id: reviewer_id || "staff-admin",
      corrected_amount:
        corrected_amount !== undefined ? Number(corrected_amount) : undefined,
    });

    if (!res.success) {
      if (res.error === "already_reviewed") {
        const payment = (res as { payment?: { reviewed_by?: string } }).payment;
        return NextResponse.json(
          {
            error: "already_reviewed",
            message: `สลิปนี้ได้รับการตรวจไปแล้วโดย ${payment?.reviewed_by || "สตาฟอีกท่าน"}`,
            payment,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    let ticketEmailSent: boolean | null = null;
    let ticketEmailStatus: string | null = null;
    let ticketEmailReason: string | null = null;

    if (res.order.status === "paid" && res.ticketsIssued > 0) {
      try {
        const tickets = await engine.getTicketsForOrder(res.order.id);
        const emailResult: any = await sendEmail({
          to: res.order.email,
          subject: "",
          template: "paid",
          data: {
            buyer_name: res.order.buyer_name,
            order_code: res.order.code,
            access_token: res.order.access_token,
            quantity: res.order.quantity,
            tickets,
          },
        });

        if (typeof emailResult === "boolean") {
          ticketEmailSent = emailResult;
          ticketEmailStatus = emailResult ? "delivered_to_provider" : "provider_error";
        } else if (emailResult && typeof emailResult === "object") {
          ticketEmailSent = Boolean(emailResult.ok);
          ticketEmailStatus = emailResult.status || null;
          ticketEmailReason = emailResult.error || null;
        }
      } catch (err) {
        console.error("[EMAIL ERROR] Ticket email preparation failed", {
          order_code: res.order.code,
          error_name: err instanceof Error ? err.name : "UnknownError",
        });
        ticketEmailSent = false;
        ticketEmailStatus = "rendering_error";
        ticketEmailReason = "เกิดข้อผิดพลาดในการเตรียมข้อมูลอีเมล";
      }
    }

    return NextResponse.json({
      success: true,
      message: "อนุมัติสลิปสำเร็จ",
      order_status: res.order.status,
      tickets_issued: res.ticketsIssued,
      ticket_email_sent: ticketEmailSent,
      ticket_email_status: ticketEmailStatus,
      ticket_email_reason: ticketEmailReason,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to approve slip" },
      { status: 500 }
    );
  }
}
