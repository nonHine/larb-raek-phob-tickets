import { describe, it, expect, beforeEach } from "vitest";
import {
  checkReceiverMatch,
  checkTransferTime,
  verifySlipWithAI,
  setMockSlipVerifier,
} from "@/lib/ai-slip-verifier";

describe("AI Slip Verifier - Receiver Matching", () => {
  it("matches PromptPay phone number in various formats", () => {
    expect(checkReceiverMatch("0812345678")).toBe(true);
    expect(checkReceiverMatch("081-234-5678")).toBe(true);
    expect(checkReceiverMatch("พร้อมเพย์ 065 751 5085")).toBe(true);
    expect(checkReceiverMatch("PromptPay: 0812345678 (ผู้จัดงาน)")).toBe(true);
  });

  it("matches Bank Account number from event config", () => {
    expect(checkReceiverMatch("xxx-x-xxxxx-x")).toBe(true);
    expect(checkReceiverMatch("xxxxxxxxx")).toBe(true);
    expect(checkReceiverMatch("xxx-x-47161-8 ธนาคารกสิกรไทย")).toBe(true);
  });

  it("matches Account Holder name keywords", () => {
    expect(checkReceiverMatch("บัญชีทางการ งานลาบแรกพบ")).toBe(true);
    expect(checkReceiverMatch("Event Official Account")).toBe(true);
    expect(checkReceiverMatch("ร้านลาบก้อยซอยนานา")).toBe(true);
  });

  it("rejects unknown accounts or numbers", () => {
    expect(checkReceiverMatch("081-999-9999 นายสมชาย")).toBe(false);
    expect(checkReceiverMatch("0987654321")).toBe(false);
    expect(checkReceiverMatch(null)).toBe(false);
    expect(checkReceiverMatch("")).toBe(false);
  });
});

describe("AI Slip Verifier - Transfer Time Validation", () => {
  const baseOrderTime = "2026-10-07T12:00:00.000Z";
  const now = new Date("2026-10-07T12:30:00.000Z");

  it("accepts transfer made after order creation and before now", () => {
    const validTransfer = "2026-10-07T12:05:00.000Z";
    expect(checkTransferTime(validTransfer, baseOrderTime, now)).toBe(true);
  });

  it("accepts transfer made slightly before order within 10 min grace window", () => {
    const graceTransfer = "2026-10-07T11:55:00.000Z";
    expect(checkTransferTime(graceTransfer, baseOrderTime, now)).toBe(true);
  });

  it("rejects transfer made significantly earlier than order creation", () => {
    const oldTransfer = "2026-10-07T10:00:00.000Z";
    expect(checkTransferTime(oldTransfer, baseOrderTime, now)).toBe(false);
  });

  it("rejects transfer far in the future", () => {
    const futureTransfer = "2026-10-07T15:00:00.000Z";
    expect(checkTransferTime(futureTransfer, baseOrderTime, now)).toBe(false);
  });

  it("rejects invalid or null dates", () => {
    expect(checkTransferTime(null, baseOrderTime, now)).toBe(false);
    expect(checkTransferTime("invalid-date", baseOrderTime, now)).toBe(false);
    expect(checkTransferTime("2026-10-07T12:05:00.000Z", null, now)).toBe(false);
  });
});

describe("AI Slip Verifier - Verification Logic & Mock Hook", () => {
  beforeEach(() => {
    setMockSlipVerifier(null);
  });

  it("gracefully falls back to manual review if GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const dummyBuffer = Buffer.from("dummy-slip");
    const result = await verifySlipWithAI({
      buffer: dummyBuffer,
      mimeType: "image/jpeg",
      expectedAmount: 49,
    });

    expect(result.isAutoApprovable).toBe(false);
    expect(result.isMatchingAmount).toBe(false);
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
          receiverAccountOrName: "0812345678 ผู้จัดงาน",
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
          receiverAccountOrName: "0812345678 ผู้จัดงาน",
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
  });
});
