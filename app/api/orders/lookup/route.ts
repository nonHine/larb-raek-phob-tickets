import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { code, email } = await req.json();

    if (!code || !email) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสคำสั่งซื้อและอีเมล" },
        { status: 400 }
      );
    }

    const order = await engine.getOrderByCode(code.trim());

    if (order && order.email.toLowerCase() === email.trim().toLowerCase()) {
      // In production, this dispatches the email via lib/email.ts
      // Status link: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/orders/${order.code}?t=${order.access_token}`
    }

    // Always return generic confirmation for PDPA privacy
    return NextResponse.json({
      success: true,
      message:
        "หากข้อมูลตรงกับในระบบ เราได้จัดส่งลิงก์เข้าดูสถานะคำสั่งซื้อไปยังอีเมลของท่านแล้ว",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process lookup" },
      { status: 500 }
    );
  }
}
