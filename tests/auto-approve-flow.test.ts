import { describe, it, expect, beforeEach } from "vitest";
import { OrderEngine } from "@/lib/engine";
import { setMockSlipVerifier } from "@/lib/ai-slip-verifier";

describe("AI Auto-Approve Flow & Engine Integration", () => {
  let engine: OrderEngine;

  beforeEach(() => {
    engine = new OrderEngine();
    setMockSlipVerifier(null);
  });

  it("can toggle AI auto-approve settings on and off", () => {
    expect(engine.getAiSettings().autoApprove).toBe(true);

    engine.setAiSettings({ autoApprove: false });
    expect(engine.getAiSettings().autoApprove).toBe(false);

    engine.setAiSettings({ autoApprove: true });
    expect(engine.getAiSettings().autoApprove).toBe(true);
  });

  it("records and retrieves AI analysis by payment id", () => {
    const paymentId = "test-payment-id";
    const analysis = {
      isAutoApprovable: true,
      summaryText: "Valid slip",
    };

    engine.recordAiAnalysis(paymentId, analysis);
    expect(engine.getAiAnalysis(paymentId)).toEqual(analysis);
    expect(engine.getAiAnalysis("unknown-id")).toBeNull();
  });

  it("allows auto-approval by system_ai and generates tickets", async () => {
    const orderRes = await engine.createOrder({
      buyer_name: "นายปัญญา ประดิษฐ์",
      phone: "0891234567",
      email: "ai@example.com",
      quantity: 1,
    });
    expect(orderRes.success).toBe(true);
    if (!orderRes.success) return;

    const payment = await engine.addPayment({
      order_id: orderRes.order.id,
      slip_path: "orders/test/ai_slip.jpg",
      slip_sha256: "ai-hash-111",
      amount_thb: 49,
      transferred_at: new Date().toISOString(),
      to_bank: "พร้อมเพย์",
      payer_name_or_last4: "ปัญญา",
    });

    expect(payment.status).toBe("pending");

    // Execute auto-approval as system_ai
    const approveRes = await engine.approvePayment({
      payment_id: payment.id,
      reviewer_id: "system_ai",
    });

    expect(approveRes.success).toBe(true);
    if (!approveRes.success) return;

    expect(approveRes.order.status).toBe("paid");
    expect(approveRes.ticketsIssued).toBe(1);

    const tickets = await engine.getTicketsForOrder(orderRes.order.id);
    expect(tickets.length).toBe(1);
    expect(tickets[0].holder_name).toBe("นายปัญญา ประดิษฐ์");
    expect(tickets[0].status).toBe("issued");
  });
});
