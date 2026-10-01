import { EVENT } from "@/config/event.config";

export interface SendEmailParams {
  to: string;
  subject: string;
  template:
    | "order_created"
    | "slip_received"
    | "paid"
    | "partial_approval"
    | "slip_rejected";
  data: {
    buyer_name: string;
    order_code: string;
    access_token?: string;
    amount?: number;
    remaining_amount?: number;
    reject_reason?: string;
    quantity?: number;
  };
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const orderUrl = `${baseUrl}/orders/${params.data.order_code}?t=${params.data.access_token || ""}`;
  const checkoutUrl = `${baseUrl}/checkout/${params.data.order_code}?t=${params.data.access_token || ""}`;

  let subject = params.subject;
  let body = "";

  switch (params.template) {
    case "order_created":
      subject = `[${EVENT.name}] ยืนยันคำสั่งซื้อบัตร #${params.data.order_code}`;
      body = `สวัสดีคุณ ${params.data.buyer_name},\n\nคำสั่งซื้อบัตรงาน "${EVENT.name}" ของคุณถูกสร้างเรียบร้อยแล้ว (จำนวน ${params.data.quantity} ใบ)\nกรุณาชำระเงินและแนบสลิปได้ที่:\n${checkoutUrl}\n\nขอบคุณครับ`;
      break;

    case "slip_received":
      subject = `[${EVENT.name}] เราได้รับสลิปการโอนเงินของออเดอร์ #${params.data.order_code} แล้ว`;
      body = `สวัสดีคุณ ${params.data.buyer_name},\n\nเราได้รับสลิปการโอนเงินของคุณแล้ว ขณะนี้อยู่ระหว่างการตรวจสอบโดยทีมงานสตาฟ\nท่านสามารถติดตามสถานะได้ที่:\n${orderUrl}`;
      break;

    case "paid":
      subject = `[${EVENT.name}] ชำระเงินสำเร็จ! บัตรเข้างานของคุณ #${params.data.order_code}`;
      body = `สวัสดีคุณ ${params.data.buyer_name},\n\nการชำระเงินสำหรับออเดอร์ #${params.data.order_code} ได้รับการอนุมัติเรียบร้อยแล้ว!\n\nคุณสามารถเปิดดูและบันทึกภาพ QR Code สำหรับเข้างานได้ที่:\n${orderUrl}\n\n* กรุณาแสดง QR Code นี้ให้สตาฟสแกนหน้างานเพื่อรับสายรัดข้อมือ (wristband)\nแล้วพบกันที่ ${EVENT.venue} ครับ!`;
      break;

    case "partial_approval":
      subject = `[${EVENT.name}] ได้รับการชำระเงินบางส่วน ออเดอร์ #${params.data.order_code}`;
      body = `สวัสดีคุณ ${params.data.buyer_name},\n\nสตาฟได้อนุมัติยอดโอน ${params.data.amount} บาท ยอดคงเหลือที่ต้องชำระเพิ่มเติมคือ ${params.data.remaining_amount} บาท\nกรุณาแนบสลิปเพิ่มเติมได้ที่:\n${checkoutUrl}`;
      break;

    case "slip_rejected":
      subject = `[${EVENT.name}] แจ้งผลการตรวจสอบสลิป ออเดอร์ #${params.data.order_code}`;
      body = `สวัสดีคุณ ${params.data.buyer_name},\n\nสลิปการโอนเงินของท่านไม่ผ่านการตรวจสอบ เนื่องจาก: ${params.data.reject_reason || "ข้อมูลไม่ถูกต้อง"}\nท่านสามารถตรวจสอบและแนบสลิปใหม่ได้ที่:\n${checkoutUrl}`;
      break;
  }

  // Non-blocking log/dispatch
  try {
    if (process.env.RESEND_API_KEY && process.env.EMAIL_PROVIDER === "resend") {
      // In production with Resend API key configured
      // await resend.emails.send(...)
    } else {
      console.log(`[EMAIL LOG] To: ${params.to} | Subject: ${subject}`);
    }
    return true;
  } catch (err) {
    console.error("[EMAIL ERROR] Failed to send email:", err);
    return false;
  }
}
