import { NextResponse } from "next/server";
import { z } from "zod";
import { engine } from "@/lib/engine";
import { EVENT } from "@/config/event.config";

export const dynamic = "force-dynamic";

const CreateOrderSchema = z.object({
  buyer_name: z.string().trim().min(1, "กรุณากรอกชื่อผู้ซื้อ"),
  phone: z.string().trim().regex(/^0[0-9]{9}$/, "กรุณาตรวจสอบหมายเลขโทรศัพท์ (10 หลัก)"),
  email: z.string().trim().email("กรุณาตรวจสอบอีเมล"),
  backup_contact: z.string().trim().optional(),
  quantity: z
    .number()
    .int()
    .min(1, "จำนวนบัตรต้องอย่างน้อย 1 ใบ")
    .max(EVENT.maxTicketsPerOrder, `จำนวนบัตรสูงสุดไม่เกิน ${EVENT.maxTicketsPerOrder} ใบ`),
  consent_non_refundable: z.literal(true, {
    errorMap: () => ({ message: "กรุณายอมรับเงื่อนไขบัตรไม่สามารถขอคืนเงินได้" }),
  }),
  consent_data_usage: z.literal(true, {
    errorMap: () => ({ message: "กรุณายินยอมให้ใช้ข้อมูลเพื่อยืนยันตัวตนและรับ wristband" }),
  }),
  website: z.string().max(0, "Bot submission detected").optional(), // Honeypot
});

export async function POST(req: Request) {
  try {
    const json = await req.json();

    // Check honeypot first
    if (json.website && json.website.length > 0) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    const parsed = CreateOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Check venue status before creating
    const venue = await engine.getVenueStatus();
    if (venue.is_full) {
      return NextResponse.json(
        {
          error: "venue_full",
          message: "ร้านเต็มชั่วคราว — กรุณารอสักครู่ หรือสอบถามสตาฟหน้างาน",
        },
        { status: 400 }
      );
    }

    const { buyer_name, phone, email, backup_contact, quantity } = parsed.data;

    const res = await engine.createOrder({
      buyer_name,
      phone,
      email,
      backup_contact,
      quantity,
    });

    if (!res.success) {
      if (res.error === "venue_full") {
        return NextResponse.json(
          {
            error: "venue_full",
            message: "ร้านเต็มชั่วคราว — กรุณารอสักครู่ หรือสอบถามสตาฟหน้างาน",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order: {
        code: res.order.code,
        access_token: res.order.access_token,
        total_thb: res.order.total_thb,
        quantity: res.order.quantity,
      },
      redirect_url: `/checkout/${res.order.code}?t=${res.order.access_token}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
