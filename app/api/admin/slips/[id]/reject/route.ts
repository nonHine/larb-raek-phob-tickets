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
    const { reviewer_id, reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุเหตุผลการปฏิเสธสลิป" },
        { status: 400 }
      );
    }

    const res = await engine.rejectPayment({
      payment_id: params.id,
      reviewer_id: reviewer_id || "staff-admin",
      reason: reason.trim(),
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

    const emailResult = await sendEmail({
      to: res.order.email,
      subject: "",
      template: "slip_rejected",
      data: {
        buyer_name: res.order.buyer_name,
        order_code: res.order.code,
        access_token: res.order.access_token,
        reject_reason: reason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "ปฏิเสธสลิปเรียบร้อย",
      order_status: res.order.status,
      ticket_email_sent: emailResult.ok,
      ticket_email_status: emailResult.status,
      ticket_email_reason: emailResult.error || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reject slip" },
      { status: 500 }
    );
  }
}
