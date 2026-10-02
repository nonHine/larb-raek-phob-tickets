import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";
import { sendEmail } from "@/lib/email";
import { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneInput = typeof body.phone === "string" ? body.phone.trim() : "";
    const emailInput = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const codeInput = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    const cleanPhone = phoneInput.replace(/[^0-9]/g, "");

    // Validation: Require either phone (10 digits) OR (code + email)
    if (!cleanPhone && (!codeInput || !emailInput)) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: "กรุณาระบุเบอร์โทรศัพท์ 10 หลัก หรือระบุรหัสคำสั่งซื้อพร้อมอีเมล",
        },
        { status: 400 }
      );
    }

    let matchingOrders: Order[] = [];

    // Path 1: Search by phone number (primary self-recovery method)
    if (cleanPhone) {
      if (!/^0[0-9]{9}$/.test(cleanPhone)) {
        return NextResponse.json(
          {
            error: "invalid_phone",
            message: "กรุณาระบุเบอร์โทรศัพท์มือถือ 10 หลักให้ถูกต้อง (เช่น 0812345678)",
          },
          { status: 400 }
        );
      }

      const foundOrders = await engine.getOrdersByPhone(cleanPhone);

      // Optional filters if user also specified code or email
      matchingOrders = foundOrders.filter((ord) => {
        if (codeInput && ord.code !== codeInput) return false;
        if (emailInput && ord.email.toLowerCase() !== emailInput) return false;
        return true;
      });
    } else if (codeInput && emailInput) {
      // Path 2: Search by Code + Email
      const order = await engine.getOrderByCode(codeInput);
      if (order && order.email.toLowerCase() === emailInput) {
        matchingOrders = [order];
      }
    }

    if (matchingOrders.length === 0) {
      return NextResponse.json(
        {
          error: "not_found",
          message: cleanPhone
            ? `ไม่พบคำสั่งซื้อที่ผูกกับเบอร์โทรศัพท์ ${cleanPhone} กรุณาตรวจสอบเบอร์ หรือติดต่อทีมงานสตาฟ`
            : "ไม่พบคำสั่งซื้อที่ตรงกับรหัสคำสั่งซื้อและอีเมลที่ระบุ",
        },
        { status: 404 }
      );
    }

    // Attempt to dispatch email in the background for each found order
    for (const ord of matchingOrders) {
      if (ord.email) {
        const isPaid = ord.status === "paid";
        sendEmail({
          to: ord.email,
          subject: `[กู้คืนลิงก์] คำสั่งซื้อ #${ord.code}`,
          template: isPaid ? "paid" : "order_created",
          data: {
            buyer_name: ord.buyer_name,
            order_code: ord.code,
            access_token: ord.access_token,
            quantity: ord.quantity,
          },
        }).catch(() => {});
      }
    }

    // Format safe response for on-screen recovery
    const formattedOrders = matchingOrders.map((ord) => {
      const isPaid = ord.status === "paid";
      const isUnderReview = ord.status === "under_review";
      const targetUrl =
        isPaid || isUnderReview
          ? `/orders/${ord.code}?t=${ord.access_token}`
          : `/checkout/${ord.code}?t=${ord.access_token}`;

      let statusLabel = "รอชำระเงิน";
      if (ord.status === "paid") statusLabel = "ชำระเงินเรียบร้อย (พร้อมเข้างาน)";
      else if (ord.status === "under_review") statusLabel = "รอตรวจสอบสลิป";
      else if (ord.status === "cancelled") statusLabel = "ยกเลิกคำสั่งซื้อ";

      // Mask sensitive info for privacy
      const maskedPhone = ord.phone.replace(/(\d{3})\d{3}(\d{4})/, "$1-XXX-$2");
      const maskedEmail = ord.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

      return {
        code: ord.code,
        buyer_name: ord.buyer_name,
        masked_phone: maskedPhone,
        masked_email: maskedEmail,
        quantity: ord.quantity,
        total_thb: ord.total_thb,
        status: ord.status,
        status_label: statusLabel,
        url: targetUrl,
        created_at: ord.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
      message: `พบคำสั่งซื้อของคุณ ${formattedOrders.length} รายการ`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process lookup" },
      { status: 500 }
    );
  }
}
