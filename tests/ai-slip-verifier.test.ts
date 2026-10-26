import { describe, it, expect, beforeEach } from "vitest";
import {
  checkReceiverMatch,
  checkTransferTime,
  verifySlipWithAI,
  setMockSlipVerifier,
} from "@/lib/ai-slip-verifier";

describe("AI Slip Verifier - Receiver Matching", () => {
  it("matches PromptPay ID in various formats", () => {
    expect(checkReceiverMatch("0812345678", "0812345678")).toBe(true);
    expect(checkReceiverMatch("081-234-5678", "0812345678")).toBe(true);
    expect(checkReceiverMatch("พร้อมเพย์ 0812345678", "0812345678")).toBe(true);
    expect(checkReceiverMatch("PromptPay: 081-234-5678 (บัญชีทางการ งานลาบแรกพบ)", "0812345678")).toBe(true);
  });

  it("matches Bank Account number from event config", () => {
    expect(checkReceiverMatch("xxx-x-xxxxx-x")).toBe(true);
    expect(checkReceiverMatch("xxxxxxxxx")).toBe(true);
  });

  it("matches QR Reference number", () => {
    expect(checkReceiverMatch("QR Ref: 000000000000000")).toBe(true);
  });

  it("matches Account Holder name keywords", () => {
    expect(checkReceiverMatch("บัญชีทางการ งานลาบแรกพบ")).toBe(true);
    expect(checkReceiverMatch("ร้านลาบก้อยซอยนานา")).toBe(true);
  });

  it("rejects unknown accounts", () => {
    expect(checkReceiverMatch("0987654321")).toBe(false);
    expect(checkReceiverMatch("081-999-9999 นายสมชาย")).toBe(false);
    expect(checkReceiverMatch(null)).toBe(false);
    expect(checkReceiverMatch("")).toBe(false);
  });
});

describe("AI Slip Verifier - Transfer Time Validation", () => {
  const baseOrderTime = "2026-10-07T12:00:00.000Z";
  const now = new Date("2026-10-07T12:30:00.000Z");

  it("accepts transfer timestamp within the valid order window", () => {
    // 5 minutes after order created
    const transferAt = "2026-10-07T12:05:00.000Z";
    expect(checkTransferTime(transferAt, baseOrderTime, now)).toBe(true);
  });

  it("accepts transfer timestamp slightly before order created within grace period (clock skew)", () => {
    // 3 minutes before order creation (within 10-minute grace window)
    const transferAt = "2026-10-07T11:57:00.000Z";
    expect(checkTransferTime(transferAt, baseOrderTime, now)).toBe(true);
  });

  it("rejects transfer timestamp that is way before order creation", () => {
    // 1 hour before order created (likely reusing an old slip)
    const transferAt = "2026-10-07T11:00:00.000Z";
    expect(checkTransferTime(transferAt, baseOrderTime, now)).toBe(false);
  });

  it("rejects transfer timestamp in the far future", () => {
    // 2 hours in the future
    const transferAt = "2026-10-07T14:30:00.000Z";
    expect(checkTransferTime(transferAt, baseOrderTime, now)).toBe(false);
  });

  it("returns false gracefully on null or unparseable timestamps", () => {
    expect(checkTransferTime(null, baseOrderTime, now)).toBe(false);
    expect(checkTransferTime("invalid-date", baseOrderTime, now)).toBe(false);
    expect(checkTransferTime("2026-10-07T12:05:00.000Z", null, now)).toBe(false);
  });
});

describe("AI Slip Verifier - End-to-End Fallbacks & Mocking", () => {
  beforeEach(() => {
    setMockSlipVerifier(null);
  });

  it("returns graceful error summary when GEMINI_API_KEY is not configured", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const result = await verifySlipWithAI({
      buffer: Buffer.from("fake-slip-image"),
      mimeType: "image/jpeg",
      expectedAmount: 49,
      orderCreatedAt: new Date().toISOString(),
    });

    expect(result.isAutoApprovable).toBe(false);
    expect(result.summaryText).toContain("ยังไม่ได้ระบุ GEMINI_API_KEY");

    process.env.GEMINI_API_KEY = originalKey;
  });

  it("evaluates mock verifier with perfectly matching slip as auto-approvable", async () => {
    setMockSlipVerifier((buffer, expected) => {
      return {
        analysis: {
          isValidSlip: true,
          bankName: "KBANK",
          senderName: "นายทดสอบ โอนไว",
          receiverAccountOrName: "0812345678 บัญชีทางการ งานลาบแรกพบ",
          transferredAt: new Date().toISOString(),
          amountThb: 49,
          transactionRef: "202610070001",
          confidenceScore: 0.98,
        },
        isMatchingAmount: true,
        isMatchingReceiver: true,
        isAutoApprovable: true,
        summaryText: "AI ตรวจสอบผ่านสมบูรณ์ (ยอด 49 ฿ ตรงเป๊ะ, ผู้รับตรง, มั่นใจ 98%)",
      };
    });

    const result = await verifySlipWithAI({
      buffer: Buffer.from("fake-slip"),
      mimeType: "image/jpeg",
      expectedAmount: 49,
    });

    expect(result.isAutoApprovable).toBe(true);
    expect(result.isMatchingAmount).toBe(true);
    expect(result.isMatchingReceiver).toBe(true);
    expect(result.analysis.confidenceScore).toBe(0.98);
  });

  it("rejects auto-approval when amount is mismatched", async () => {
    setMockSlipVerifier((buffer, expected) => {
      const detectedAmount = 20;
      const isMatching = detectedAmount === expected;
      return {
        analysis: {
          isValidSlip: true,
          bankName: "KBANK",
          senderName: "นายทดสอบ โอนไว",
          receiverAccountOrName: "0812345678 บัญชีทางการ งานลาบแรกพบ",
          transferredAt: new Date().toISOString(),
          amountThb: detectedAmount,
          transactionRef: "202610070002",
          confidenceScore: 0.95,
        },
        isMatchingAmount: isMatching,
        isMatchingReceiver: true,
        isAutoApprovable: isMatching,
        summaryText: "AI แนะนำให้ตรวจสอบด้วยมือ: ยอดไม่ตรง",
      };
    });

    const result = await verifySlipWithAI({
      buffer: Buffer.from("fake-slip"),
      mimeType: "image/jpeg",
      expectedAmount: 49,
    });

    expect(result.isAutoApprovable).toBe(false);
    expect(result.isMatchingAmount).toBe(false);
    expect(result.summaryText).toContain("ยอดไม่ตรง");
  });
});
