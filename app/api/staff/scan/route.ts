import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { ticket_code, staff_id } = await req.json();

    if (!ticket_code || !ticket_code.trim()) {
      return NextResponse.json(
        { error: "invalid_ticket", message: "ไม่พบรหัสบัตร" },
        { status: 400 }
      );
    }

    const cleanCode = ticket_code.trim().toUpperCase();
    const res = await engine.checkInTicket(cleanCode, staff_id || "staff-door");

    if (!res.success) {
      if (res.error === "already_checked_in") {
        const timeStr = res.checked_in_at
          ? new Date(res.checked_in_at).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "ก่อนหน้านี้";

        return NextResponse.json(
          {
            error: "already_checked_in",
            message: `บัตรนี้เข้างานแล้วเมื่อ ${timeStr}`,
            checked_in_at: res.checked_in_at,
            checked_in_by: res.checked_in_by,
            ticket: res.ticket,
          },
          { status: 409 }
        );
      }

      if (res.error === "void_ticket") {
        return NextResponse.json(
          {
            error: "void_ticket",
            message: "บัตรนี้ถูกยกเลิกแล้ว (โมฆะ)",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "invalid_ticket",
          message: "บัตรไม่ถูกต้อง หรือไม่พบในระบบ",
        },
        { status: 404 }
      );
    }

    const order = await engine.getOrderById(res.ticket.order_id);

    return NextResponse.json({
      success: true,
      message: "เช็กอินสำเร็จ — ให้ wristband แล้ว",
      ticket: {
        code: res.ticket.code,
        holder_name: res.ticket.holder_name,
        order_code: order?.code,
        checked_in_at: res.ticket.checked_in_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process scan" },
      { status: 500 }
    );
  }
}
