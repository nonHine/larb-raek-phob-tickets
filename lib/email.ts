import { Resend } from "resend";
import QRCode from "qrcode";
import { EVENT } from "@/config/event.config";
import { Ticket } from "@/lib/types";

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

type EmailClient = Pick<Resend, "emails">;

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

async function buildTemplate(params: SendEmailParams, orderUrl: string, checkoutUrl: string) {
  const { buyer_name, order_code, quantity, amount, remaining_amount, reject_reason } = params.data;
  let subject = params.subject;
  let text = "";
  let html = "";
  const attachments: NonNullable<Parameters<EmailClient["emails"]["send"]>[0]["attachments"]> = [];

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
            contentId,
          });
          return `<section style="margin:24px auto;padding:20px;max-width:360px;border:1px solid #e5e7eb;border-radius:12px;text-align:center"><h2 style="font-size:18px;margin:0 0 12px">บัตรใบที่ ${index + 1} จาก ${tickets.length}</h2><img src="cid:${escapeHtml(contentId)}" width="280" height="280" alt="QR Code บัตรใบที่ ${index + 1}" style="display:block;width:280px;height:280px;margin:0 auto" /></section>`;
        })
      );

      html = `<div style="font-family:Arial,sans-serif;color:#262626;line-height:1.6"><p>สวัสดีคุณ ${escapeHtml(buyer_name)},</p><p>ชำระเงินสำหรับออเดอร์ <strong>${escapeHtml(order_code)}</strong> สำเร็จแล้ว นี่คือ QR Code แยกสำหรับบัตรแต่ละใบ</p>${ticketImages.join("")}<p>หากไม่เห็น QR Code <a href="${escapeHtml(orderUrl)}">เปิดหน้าตั๋วส่วนตัวเพื่อดูและบันทึก QR Code</a></p><p>แสดง QR ของแต่ละใบให้สตาฟสแกนหน้างานเพื่อรับสายรัดข้อมือ</p><p><strong>${escapeHtml(EVENT.name)}</strong><br/>${escapeHtml(EVENT.venue)}<br/>${escapeHtml(EVENT.startsAt || "")}</p></div>`;
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

export async function sendEmail(
  params: SendEmailParams,
  client?: EmailClient
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.APP_BASE_URL;

  if (process.env.EMAIL_PROVIDER !== "resend" || !apiKey || !from || !baseUrl) {
    console.error("[EMAIL ERROR] Resend is not fully configured", {
      template: params.template,
      order_code: params.data.order_code,
    });
    return false;
  }

  try {
    const orderUrl = `${baseUrl.replace(/\/$/, "")}/orders/${encodeURIComponent(params.data.order_code)}?t=${encodeURIComponent(params.data.access_token || "")}`;
    const checkoutUrl = `${baseUrl.replace(/\/$/, "")}/checkout/${encodeURIComponent(params.data.order_code)}?t=${encodeURIComponent(params.data.access_token || "")}`;
    const message = await buildTemplate(params, orderUrl, checkoutUrl);
    const resend = client || new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.attachments.length > 0 ? { attachments: message.attachments } : {}),
    });

    if (error || !data?.id) {
      console.error("[EMAIL ERROR] Resend rejected email", {
        template: params.template,
        order_code: params.data.order_code,
        error_name: error?.name || "UnknownError",
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error("[EMAIL ERROR] Failed to send email", {
      template: params.template,
      order_code: params.data.order_code,
      error_name: err instanceof Error ? err.name : "UnknownError",
    });
    return false;
  }
}
