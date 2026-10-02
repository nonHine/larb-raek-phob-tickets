import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { EVENT } from "@/config/event.config";
import { Ticket } from "@/lib/types";

export type EmailStatus =
  | "delivered_to_provider"
  | "config_missing"
  | "sender_rejected"
  | "auth_failed"
  | "provider_error"
  | "rendering_error"
  | "not_eligible"
  | "unknown_result";

export interface SendEmailResult {
  ok: boolean;
  status: EmailStatus;
  provider_id?: string;
  error?: string;
}

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
    tickets?: Ticket[];
  };
}

export interface SmtpTransportLike {
  sendMail: (mailOptions: any) => Promise<any>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function classifySmtpError(error: unknown): { status: EmailStatus; message: string } {
  if (!error || typeof error !== "object") {
    return { status: "unknown_result", message: "ระบบส่งอีเมลไม่ตอบสนองหรือไม่ทราบสาเหตุแน่ชัด" };
  }

  const errObj = error as Record<string, any>;
  const code = String(errObj.code || "").toUpperCase();
  const responseCode = Number(errObj.responseCode || 0);
  const msg = String(errObj.message || "").toLowerCase();

  // Authentication error (535, EAUTH, invalid login / app password)
  if (
    code === "EAUTH" ||
    responseCode === 535 ||
    msg.includes("badcredentials") ||
    msg.includes("username and password not accepted") ||
    msg.includes("invalid login") ||
    msg.includes("authentication failed")
  ) {
    return {
      status: "auth_failed",
      message: "การยืนยันตัวตนกับ Gmail ล้มเหลว โปรดตรวจสอบ App Password 16 หลัก",
    };
  }

  // Connection / DNS / Timeout
  if (
    code === "ESOCKET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "EDNS" ||
    msg.includes("timeout") ||
    msg.includes("connection closed")
  ) {
    return {
      status: "provider_error",
      message: "ไม่สามารถเชื่อมต่อกับ Gmail เซิร์ฟเวอร์ได้ (Connection timeout/refused)",
    };
  }

  // Daily sending quota / Rate limit
  if (
    responseCode === 421 ||
    responseCode === 450 ||
    responseCode === 452 ||
    msg.includes("quota") ||
    msg.includes("rate limit")
  ) {
    return {
      status: "provider_error",
      message: "เกินโควตาการส่งอีเมลของ Gmail ชั่วคราว (Gmail daily limit exceeded)",
    };
  }

  return {
    status: "provider_error",
    message: "Gmail เซิร์ฟเวอร์ปฏิเสธคำขอส่งอีเมล: " + (errObj.message || "Unknown SMTP error"),
  };
}

async function buildTemplate(params: SendEmailParams, orderUrl: string, checkoutUrl: string) {
  const { buyer_name, order_code, quantity, amount, remaining_amount, reject_reason } = params.data;
  let subject = params.subject;
  let text = "";
  let html = "";
  const attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    cid: string;
  }> = [];

  switch (params.template) {
    case "order_created":
      subject = `[${EVENT.name}] ยืนยันคำสั่งซื้อบัตร #${order_code}`;
      text = `สวัสดีคุณ ${buyer_name},\n\nคำสั่งซื้อบัตรงาน "${EVENT.name}" ของคุณถูกสร้างเรียบร้อยแล้ว (จำนวน ${quantity} ใบ)\nกรุณาชำระเงินและแนบสลิปได้ที่:\n${checkoutUrl}\n\nขอบคุณครับ`;
      break;
    case "slip_received":
      subject = `[${EVENT.name}] เราได้รับสลิปการโอนเงินของออเดอร์ #${order_code} แล้ว`;
      text = `สวัสดีคุณ ${buyer_name},\n\nเราได้รับสลิปการโอนเงินของคุณแล้ว ขณะนี้อยู่ระหว่างการตรวจสอบโดยทีมงานสตาฟ\nท่านสามารถติดตามสถานะได้ที่:\n${orderUrl}`;
      break;
    case "paid": {
      const tickets = params.data.tickets || [];
      if (tickets.length === 0) {
        throw new Error("Paid ticket email requires at least one issued ticket");
      }

      subject = `[${EVENT.name}] ชำระเงินสำเร็จ! บัตรเข้างานของคุณ #${order_code}`;
      text = `สวัสดีคุณ ${buyer_name},\n\nการชำระเงินสำหรับออเดอร์ #${order_code} ได้รับการอนุมัติเรียบร้อยแล้ว\nมีบัตรเข้างาน ${tickets.length} ใบ กรุณาเปิดอีเมลในรูปแบบ HTML เพื่อดู QR Code หรือเปิดหน้าตั๋วส่วนตัวที่:\n${orderUrl}\n\nแสดง QR ของแต่ละใบให้สตาฟสแกนหน้างานเพื่อรับสายรัดข้อมือ\n${EVENT.name}\n${EVENT.venue}\n${EVENT.startsAt || ""}`;

      const ticketImages = await Promise.all(
        tickets.map(async (ticket, index) => {
          const contentId = `ticket-${index + 1}-${ticket.id}`;
          const png = await QRCode.toBuffer(ticket.code, {
            type: "png",
            errorCorrectionLevel: "M",
            margin: 2,
            width: 320,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          attachments.push({
            filename: `ticket-${index + 1}.png`,
            content: png,
            contentType: "image/png",
            cid: contentId,
          });
          return `<section style="margin:24px auto;padding:20px;max-width:360px;border:1px solid #e5e7eb;border-radius:12px;text-align:center;background-color:#ffffff"><h2 style="font-size:18px;margin:0 0 12px;color:#111827">บัตรใบที่ ${index + 1} จาก ${tickets.length}</h2><img src="cid:${escapeHtml(contentId)}" width="280" height="280" alt="QR Code บัตรใบที่ ${index + 1}" style="display:block;width:280px;height:280px;margin:0 auto" /></section>`;
        })
      );

      html = `<div style="font-family:Arial,sans-serif;color:#262626;line-height:1.6;max-width:600px;margin:0 auto;padding:20px"><p style="font-size:16px">สวัสดีคุณ <strong>${escapeHtml(buyer_name)}</strong>,</p><p>ชำระเงินสำหรับคำสั่งซื้อ <strong>#${escapeHtml(order_code)}</strong> สำเร็จแล้ว นี่คือ QR Code สำหรับบัตรแต่ละใบของคุณ:</p>${ticketImages.join("")}<div style="text-align:center;margin:28px 0"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:12px 24px;background-color:#8F1D2D;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px">เปิดดูตั๋วและบันทึก QR Code บนเว็บไซต์</a></div><p style="font-size:13px;color:#6b7280;text-align:center">แสดง QR Code แต่ละใบให้สตาฟสแกนหน้างานเพื่อรับสายรัดข้อมือ</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" /><p style="font-size:13px;color:#6b7280"><strong>${escapeHtml(EVENT.name)}</strong><br/>สถานที่: ${escapeHtml(EVENT.venue)}<br/>วันและเวลา: ${escapeHtml(EVENT.startsAt || "")}</p></div>`;
      break;
    }
    case "partial_approval":
      subject = `[${EVENT.name}] ได้รับการชำระเงินบางส่วน ออเดอร์ #${order_code}`;
      text = `สวัสดีคุณ ${buyer_name},\n\nสตาฟได้อนุมัติยอดโอน ${amount} บาท ยอดคงเหลือที่ต้องชำระเพิ่มเติมคือ ${remaining_amount} บาท\nกรุณาแนบสลิปเพิ่มเติมได้ที่:\n${checkoutUrl}`;
      break;
    case "slip_rejected":
      subject = `[${EVENT.name}] แจ้งผลการตรวจสอบสลิป ออเดอร์ #${order_code}`;
      text = `สวัสดีคุณ ${buyer_name},\n\nสลิปการโอนเงินของท่านไม่ผ่านการตรวจสอบ เนื่องจาก: ${reject_reason || "ข้อมูลไม่ถูกต้อง"}\nท่านสามารถตรวจสอบและแนบสลิปใหม่ได้ที่:\n${checkoutUrl}`;
      break;
  }

  if (!html) {
    html = `<div style="font-family:Arial,sans-serif;color:#262626;line-height:1.6;white-space:pre-line">${escapeHtml(text)}</div>`;
  }

  return { subject, text, html, attachments };
}

function createDefaultTransporter(): SmtpTransportLike {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ""); // strip spaces from App Password
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail(
  params: SendEmailParams,
  transport?: SmtpTransportLike
): Promise<SendEmailResult> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || (smtpUser ? `งานลาบแรกพบ <${smtpUser}>` : undefined);
  const baseUrl = process.env.APP_BASE_URL;

  // 1. Check configuration
  if (!smtpUser || !smtpPass || !from || !baseUrl) {
    console.error("[EMAIL ERROR] Gmail SMTP is not fully configured", {
      template: params.template,
      order_code: params.data.order_code,
      has_user: Boolean(smtpUser),
      has_pass: Boolean(smtpPass),
      has_from: Boolean(from),
      has_base_url: Boolean(baseUrl),
    });
    return {
      ok: false,
      status: "config_missing",
      error: "การตั้งค่าระบบส่งอีเมล Gmail SMTP ไม่สมบูรณ์ (Missing SMTP configuration)",
    };
  }

  // 2. Validate eligibility (e.g. paid template requires issued tickets)
  if (params.template === "paid") {
    const tickets = params.data.tickets || [];
    if (tickets.length === 0) {
      console.error("[EMAIL ERROR] Paid email requested without issued tickets", {
        order_code: params.data.order_code,
      });
      return {
        ok: false,
        status: "not_eligible",
        error: "ยังไม่มีตั๋วที่ออกสำหรับคำสั่งซื้อนี้ ไม่สามารถส่งอีเมล QR ได้",
      };
    }
  }

  // 3. Build template & attachments
  let message: Awaited<ReturnType<typeof buildTemplate>>;
  try {
    const orderUrl = `${baseUrl.replace(/\/$/, "")}/orders/${encodeURIComponent(params.data.order_code)}?t=${encodeURIComponent(params.data.access_token || "")}`;
    const checkoutUrl = `${baseUrl.replace(/\/$/, "")}/checkout/${encodeURIComponent(params.data.order_code)}?t=${encodeURIComponent(params.data.access_token || "")}`;
    message = await buildTemplate(params, orderUrl, checkoutUrl);
  } catch (renderErr) {
    console.error("[EMAIL ERROR] Template rendering failed", {
      template: params.template,
      order_code: params.data.order_code,
      error_name: renderErr instanceof Error ? renderErr.name : "UnknownError",
    });
    return {
      ok: false,
      status: "rendering_error",
      error: "เกิดข้อผิดพลาดในการสร้าง QR Code หรือเนื้อหาอีเมล",
    };
  }

  // 4. Send via Nodemailer transporter
  try {
    const activeTransport = transport || createDefaultTransporter();
    const info = await activeTransport.sendMail({
      from,
      to: params.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });

    return {
      ok: true,
      status: "delivered_to_provider",
      provider_id: info?.messageId || "smtp-ok",
    };
  } catch (err: any) {
    const classified = classifySmtpError(err);
    console.error("[EMAIL ERROR] Gmail SMTP send failed", {
      template: params.template,
      order_code: params.data.order_code,
      status: classified.status,
      code: err?.code,
    });
    return {
      ok: false,
      status: classified.status,
      error: classified.message,
    };
  }
}
