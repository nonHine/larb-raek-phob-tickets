import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";
import { parseSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Verify staff session cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/staff_session=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    const session = await parseSessionToken(token);

    if (!session.valid || !session.role) {
      return NextResponse.json(
        { error: "unauthorized", message: "กรุณาเข้าสู่ระบบเจ้าหน้าที่ก่อนทำรายการ" },
        { status: 401 }
      );
    }

    const staffId = session.role === "admin" ? "staff-admin" : "staff-scanner";

    // 2. Parse request body
    const body = await req.json();
    const { buyer_name, phone, quantity, payment_method, check_in_now_count } = body;

    // 3. Validation
    const numQuantity = Number(quantity);
    if (!quantity || isNaN(numQuantity) || numQuantity < 1) {
      return NextResponse.json(
        { error: "invalid_quantity", message: "จำนวนบัตรต้องอย่างน้อย 1 ใบ" },
        { status: 400 }
      );
    }

    // 3. Normalize & validate payment method
    let normalizedPaymentMethod: "cash_onsite" | "promptpay_onsite" | null = null;
    if (payment_method === "cash_onsite" || payment_method === "cash") {
      normalizedPaymentMethod = "cash_onsite";
    } else if (payment_method === "promptpay_onsite" || payment_method === "promptpay") {
      normalizedPaymentMethod = "promptpay_onsite";
    }

    if (!normalizedPaymentMethod) {
      return NextResponse.json(
        {
          error: "invalid_payment_method",
          message: "วิธีชำระเงินไม่ถูกต้อง (ต้องเป็น cash_onsite หรือ promptpay_onsite)",
        },
        { status: 400 }
      );
    }

    // 4. Create walk-up order via engine
    const result = await engine.createWalkUpOrder({
      buyer_name,
      phone,
      quantity: numQuantity,
      payment_method: normalizedPaymentMethod,
      check_in_now_count:
        check_in_now_count !== undefined && check_in_now_count !== null
          ? Number(check_in_now_count)
          : undefined,
      staff_id: body.staff_id || staffId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process walk-up order" },
      { status: 500 }
    );
  }
}
