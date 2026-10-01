import { NextResponse } from "next/server";
import crypto from "crypto";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

// Content sniffing function to verify genuine MIME types via magic bytes
function sniffFileType(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 8) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // PDF: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { ext: "pdf", mime: "application/pdf" };
  }

  // WebP: 'RIFF' .... 'WEBP'
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  // HEIC / HEIF: 'ftypheic' / 'ftypmif1'
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (["heic", "heix", "mif1", "msf1"].includes(brand)) {
      return { ext: "heic", mime: "image/heic" };
    }
  }

  return null;
}

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const formData = await req.formData();
    const token = formData.get("token") as string | null;
    const file = formData.get("file") as File | null;
    const amountStr = formData.get("amount_thb") as string | null;
    const transferredAt = (formData.get("transferred_at") as string | null) || new Date().toISOString();
    const toBank = (formData.get("to_bank") as string | null) || "พร้อมเพย์";
    const payerNameOrLast4 = (formData.get("payer_name_or_last4") as string | null) || "ไม่ระบุ";

    const code = params.code;

    // 1. Verify token
    if (!token || !code) {
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

    // 2. Order level checks: check max slips per order (10)
    const existingPayments = await engine.getPaymentsForOrder(order.id);
    if (existingPayments.length >= 10) {
      return NextResponse.json(
        {
          error: "max_slips_exceeded",
          message: "แนบสลิปเกินจำนวนที่กำหนดสำหรับคำสั่งซื้อนี้ (สูงสุด 10 ครั้ง)",
        },
        { status: 400 }
      );
    }

    // 3. File validation
    if (!file) {
      return NextResponse.json(
        { error: "missing_file", message: "กรุณาแนบภาพสลิปการโอนเงิน" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: "file_too_large",
          message: "ไฟล์มีขนาดเกิน 10 MB กรุณาเลือกไฟล์ที่เล็กกว่า",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Content sniffing
    const sniffed = sniffFileType(buffer);
    if (!sniffed) {
      return NextResponse.json(
        {
          error: "invalid_file_type",
          message:
            "ชนิดไฟล์ไม่ถูกต้อง กรุณาอัปโหลดรูปภาพ (JPEG, PNG, WEBP) หรือไฟล์ PDF",
        },
        { status: 400 }
      );
    }

    // 5. SHA-256 Hash
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // 6. Amount validation
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "invalid_amount", message: "จำนวนเงินที่ระบุไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const slipUuid = crypto.randomUUID();
    const slipPath = `orders/${order.id}/${slipUuid}.${sniffed.ext}`;

    // 7. Add payment to engine
    const payment = await engine.addPayment({
      order_id: order.id,
      slip_path: slipPath,
      slip_sha256: sha256,
      amount_thb: amount,
      transferred_at: transferredAt,
      to_bank: toBank,
      payer_name_or_last4: payerNameOrLast4,
    });

    return NextResponse.json({
      success: true,
      message: "เราได้รับสลิปแล้ว อยู่ระหว่างตรวจสอบ",
      payment: {
        id: payment.id,
        amount_thb: payment.amount_thb,
        status: payment.status,
        created_at: payment.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process slip upload" },
      { status: 500 }
    );
  }
}
