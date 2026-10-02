import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email";

const originalEnv = {
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
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
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "re_test_only";
  process.env.EMAIL_FROM = "tickets@example.test";
  process.env.APP_BASE_URL = "https://tickets.example.test/";
}

const tickets = [
  { id: "ticket-1", code: "TICKETCODE0000001" },
  { id: "ticket-2", code: "TICKETCODE0000002" },
] as any;

describe("ticket email delivery", () => {
  it("embeds one unique QR image for each ticket and a private fallback link", async () => {
    configureEmail();
    const send = vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });
    const client = { emails: { send } } as any;

    const sent = await sendEmail(
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
      client
    );

    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    const message = send.mock.calls[0][0];
    expect(message.to).toBe("buyer@example.test");
    expect(message.html).toContain("cid:ticket-1-ticket-1");
    expect(message.html).toContain("cid:ticket-2-ticket-2");
    expect(message.html).toContain(
      "https://tickets.example.test/orders/LRP-12345?t=private-token"
    );
    expect(message.attachments).toHaveLength(2);
    expect(message.attachments.every((item: any) => item.contentType === "image/png")).toBe(true);
    expect(Buffer.isBuffer(message.attachments[0].content)).toBe(true);
  });

  it("does not send paid email when no issued tickets are supplied", async () => {
    configureEmail();
    const send = vi.fn();
    const sent = await sendEmail(
      {
        to: "buyer@example.test",
        subject: "",
        template: "paid",
        data: { buyer_name: "ผู้ซื้อ", order_code: "LRP-12345", tickets: [] },
      },
      { emails: { send } } as any
    );

    expect(sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("reports provider failure without throwing", async () => {
    configureEmail();
    const send = vi.fn().mockResolvedValue({ data: null, error: { name: "validation_error" } });
    const sent = await sendEmail(
      {
        to: "buyer@example.test",
        subject: "",
        template: "paid",
        data: { buyer_name: "ผู้ซื้อ", order_code: "LRP-12345", tickets: [tickets[0]] },
      },
      { emails: { send } } as any
    );

    expect(sent).toBe(false);
  });

  it("fails closed when required Resend configuration is missing", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.APP_BASE_URL;
    const send = vi.fn();

    const sent = await sendEmail(
      {
        to: "buyer@example.test",
        subject: "",
        template: "order_created",
        data: { buyer_name: "ผู้ซื้อ", order_code: "LRP-12345" },
      },
      { emails: { send } } as any
    );

    expect(sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
