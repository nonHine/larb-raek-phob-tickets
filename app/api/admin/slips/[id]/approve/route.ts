import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

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

    return NextResponse.json({
      success: true,
      message: "อนุมัติสลิปสำเร็จ",
      order_status: res.order.status,
      tickets_issued: res.ticketsIssued,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to approve slip" },
      { status: 500 }
    );
  }
}
