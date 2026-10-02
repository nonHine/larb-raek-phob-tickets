import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail, classifySmtpError } from "@/lib/email";

const originalEnv = {
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  APP_BASE_URL: process.env.APP_BASE_URL,
};

afterEach(() => {
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
});

function configureEmail() {
  process.env.SMTP_USER = "tickets@example.test";
  process.env.SMTP_PASS = "test-app-password-1234";
  process.env.EMAIL_FROM = "งานลาบแรกพบ <tickets@example.test>";
  process.env.APP_BASE_URL = "https://tickets.example.test/";
}

const tickets = [
  { id: "ticket-1", code: "TICKETCODE0000001" },
  { id: "ticket-2", code: "TICKETCODE0000002" },
] as any;

describe("ticket email delivery via Gmail SMTP", () => {
  it("embeds one unique QR image for each ticket and a private fallback link", async () => {
    configureEmail();
    const sendMail = vi.fn().mockResolvedValue({ messageId: "email-1" });
    const transport = { sendMail } as any;

    const result = await sendEmail(
      {
        to: "buyer@example.test",
        subject: "ignored by paid template",
        template: "paid",
        data: {
          buyer_name: "ผู้ซื้อ",
          order_code: "LRP-12345",
          access_token: "private-token",
          tickets,
        },
      },
      transport
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe("delivered_to_provider");
    expect(result.provider_id).toBe("email-1");
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe("buyer@example.test");
    expect(message.html).toContain("cid:ticket-1-ticket-1");
    expect(message.html).toContain("cid:ticket-2-ticket-2");
    expect(message.html).toContain(
      "https://tickets.example.test/orders/LRP-12345?t=private-token"
    );
    expect(message.attachments).toHaveLength(2);
    expect(message.attachments.every((item: any) => item.contentType === "image/png")).toBe(true);
    expect(message.attachments[0].cid).toBe("ticket-1-ticket-1");
    expect(Buffer.isBuffer(message.attachments[0].content)).toBe(true);
  });

  it("does not send paid email when no issued tickets are supplied", async () => {
    configureEmail();
    const sendMail = vi.fn();
    const result = await sendEmail(
      {
        to: "buyer@example.test",
        subject: "",
        template: "paid",
        data: { buyer_name: "ผู้ซื้อ", order_code: "LRP-12345", tickets: [] },
      },
      { sendMail } as any
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("not_eligible");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("reports provider failure without throwing and classifies SMTP auth failure", async () => {
    configureEmail();
    const sendMail = vi.fn().mockRejectedValue({
      code: "EAUTH",
      responseCode: 535,
      message: "5.7.8 Username and Password not accepted",
    });
    const result = await sendEmail(
      {
        to: "buyer@example.test",
        subject: "",
        template: "paid",
        data: { buyer_name: "ผู้ซื้อ", order_code: "LRP-12345", tickets: [tickets[0]] },
      },
      { sendMail } as any
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("auth_failed");
    expect(result.error).toContain("App Password");
  });

  it("fails closed when required SMTP configuration is missing", async () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
    delete process.env.APP_BASE_URL;
    const sendMail = vi.fn();

    const result = await sendEmail(
      {
        to: "buyer@example.test",
        subject: "",
        template: "order_created",
        data: { buyer_name: "ผู้ซื้อ", order_code: "LRP-12345" },
      },
      { sendMail } as any
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("config_missing");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("correctly classifies rate limits and connection errors", () => {
    const rateLimit = { responseCode: 452, message: "Daily user sending quota exceeded" };
    expect(classifySmtpError(rateLimit).status).toBe("provider_error");

    const connTimeout = { code: "ETIMEDOUT", message: "Connection timed out" };
    expect(classifySmtpError(connTimeout).status).toBe("provider_error");
  });
});
