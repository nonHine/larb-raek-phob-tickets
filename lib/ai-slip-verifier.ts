import { EVENT } from "@/config/event.config";

export interface SlipAnalysis {
  isValidSlip: boolean;
  bankName: string | null;
  senderName: string | null;
  receiverAccountOrName: string | null;
  transferredAt: string | null;
  amountThb: number | null;
  transactionRef: string | null;
  confidenceScore: number; // 0.0 - 1.0
  reason?: string;
  rawText?: string;
}

export interface VerificationResult {
  analysis: SlipAnalysis;
  isMatchingAmount: boolean;
  isMatchingReceiver: boolean;
  isAutoApprovable: boolean;
  summaryText: string;
}

// Mock hook for unit testing without live API keys
let mockVerifier: ((buffer: Buffer, expectedAmount: number) => Promise<VerificationResult> | VerificationResult) | null = null;

export function setMockSlipVerifier(
  fn: ((buffer: Buffer, expectedAmount: number) => Promise<VerificationResult> | VerificationResult) | null
) {
  mockVerifier = fn;
}

/**
 * Names that may appear as the receiver on a genuine slip. Thai bank slips
 * usually mask the receiver's number, so the first name is often the only
 * usable signal. Override with AI_RECEIVER_NAMES="ชื่อ1,name2".
 */
function getReceiverNames(): string[] {
  const fromEnv = (process.env.AI_RECEIVER_NAMES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 3);
  if (fromEnv.length > 0) return fromEnv;
  // Default: configured bank account holder names, romanizations, and event venue keywords
  const names: string[] = [];
  for (const b of EVENT.banks) {
    const parts = b.accountName.trim().split(/\s+/).map((s) => s.toLowerCase());
    names.push(...parts.filter((p) => p.length >= 3));
  }
  return [
    ...names,
    "ผู้จัดงาน",
    "ทางการ",
    "ramnarongchai",
    "jantapha",
    "ร้านลาบก้อยซอยนานา",
    "ลาบแรกพบ",
  ];
}

/**
 * Checks if the detected receiver text matches the event's receiving account.
 * Deliberately strict: a false "match" can lead to an automatic approval.
 */
export function checkReceiverMatch(
  receiverText: string | null,
  targetPromptPay: string = process.env.PROMPTPAY_ID || EVENT.promptPay?.id || "081-234-5678"
): boolean {
  if (!receiverText) return false;
  const clean = receiverText.replace(/[\s-]/g, "").toLowerCase();

  // 1. Full PromptPay ID (unmasked)
  const cleanPromptPay = targetPromptPay.replace(/[\s-]/g, "").toLowerCase();
  if (cleanPromptPay.length >= 10 && clean.includes(cleanPromptPay)) return true;

  // Masked PromptPay ID (e.g. 1-8399-xxxxx-xx-x or xxx-xx-92657)
  if (cleanPromptPay.length === 13) {
    const last5 = cleanPromptPay.slice(-5);
    const first5 = cleanPromptPay.slice(0, 5);
    if (clean.includes(last5) || (clean.includes(first5) && clean.length <= 15)) {
      return true;
    }
  }

  // 2. QR Reference number (e.g. 000000000000000)
  const qrRef = EVENT.promptPay?.qrReference?.replace(/[\s-]/g, "").toLowerCase();
  if (qrRef && qrRef.length >= 8 && clean.includes(qrRef)) return true;

  // 3. Bank account number (full or masked last 5-6 digits e.g. xxx-x-54785 or xxx-x-xxxxx-x)
  for (const b of EVENT.banks) {
    const cleanAcc = b.accountNo.replace(/[\s-]/g, "");
    const rawAcc = b.rawAccountNo ? b.rawAccountNo.replace(/[\s-]/g, "") : cleanAcc;
    if (cleanAcc.length >= 10 && clean.includes(cleanAcc)) return true;
    if (rawAcc.length >= 10 && clean.includes(rawAcc)) return true;
    if (cleanAcc.length >= 5 && clean.includes(cleanAcc.slice(-5))) return true;
    if (rawAcc.length >= 5 && clean.includes(rawAcc.slice(-5))) return true;
  }

  // 4. Receiver name or event identity
  const lower = receiverText.toLowerCase();
  return getReceiverNames().some((name) => lower.includes(name));
}

/**
 * The transfer must happen after the order was created (with a small grace
 * window for clock skew) and not in the future.
 */
export function checkTransferTime(
  transferredAt: string | null,
  orderCreatedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!transferredAt || !orderCreatedAt) return false;
  const t = new Date(transferredAt).getTime();
  const created = new Date(orderCreatedAt).getTime();
  if (isNaN(t) || isNaN(created)) return false;
  const GRACE_MS = 10 * 60 * 1000;
  return t >= created - GRACE_MS && t <= now.getTime() + GRACE_MS;
}

/**
 * Verify slip image using Google Gemini Multimodal Vision API
 */
export async function verifySlipWithAI(params: {
  buffer: Buffer;
  mimeType: string;
  expectedAmount: number;
  targetPromptPay?: string;
  orderCreatedAt?: string | null;
}): Promise<VerificationResult> {
  const { buffer, mimeType, expectedAmount, targetPromptPay, orderCreatedAt } = params;

  // If a mock verifier is configured (e.g. during automated testing), use it
  if (mockVerifier) {
    return await mockVerifier(buffer, expectedAmount);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "mock") {
    // If no API key configured, gracefully fallback to manual review
    const analysis: SlipAnalysis = {
      isValidSlip: true,
      bankName: null,
      senderName: null,
      receiverAccountOrName: null,
      transferredAt: null,
      amountThb: null,
      transactionRef: null,
      confidenceScore: 0,
      reason: "GEMINI_API_KEY not configured. Slip queued for manual review.",
    };

    return {
      analysis,
      isMatchingAmount: false,
      isMatchingReceiver: false,
      isAutoApprovable: false,
      summaryText: "ยังไม่ได้ระบุ GEMINI_API_KEY ในระบบ — รอดำเนินการตรวจสอบด้วยมือ",
    };
  }

  try {
    const base64Data = buffer.toString("base64");
    const prompt = `
You are an expert Thai bank slip OCR and verification system.
Examine this payment slip image carefully.
Extract the following details as strictly JSON with no markdown wrapping:
{
  "isValidSlip": true or false (is this a genuine Thai bank transfer slip),
  "bankName": "Bank name (e.g. KBANK, SCB, KTB, BBL, TTB, GSB, PromptPay) or null",
  "senderName": "Name of sender or null",
  "receiverAccountOrName": "Receiver name and account/PromptPay number exactly as printed (may be masked, e.g. xxx-x-x5085) or null",
  "transferredAt": "Transfer date-time as ISO 8601 with +07:00 offset, Gregorian year (convert Buddhist year: subtract 543, e.g. 7 ต.ค. 69 -> 2026-10-07) or null",
  "amountThb": numeric transfer amount in THB (e.g. 49.00 or 98.00) or null,
  "transactionRef": "Bank transaction reference number or null",
  "confidenceScore": confidence number from 0.0 to 1.0,
  "notes": "Any anomalies, e.g. blurry image, edited fonts, missing QR code"
}
`;

    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const candidateModels = [
      primaryModel,
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.8-flash",
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let res: Response | null = null;
    let successfulModel = primaryModel;

    for (const modelName of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (r.ok) {
        res = r;
        successfulModel = modelName;
        break;
      }

      console.warn(`Gemini API ${modelName} returned HTTP ${r.status}. Trying next model...`);
      res = r;
    }

    if (!res || !res.ok) {
      const status = res ? res.status : 500;
      return {
        analysis: {
          isValidSlip: true,
          bankName: null,
          senderName: null,
          receiverAccountOrName: null,
          transferredAt: null,
          amountThb: null,
          transactionRef: null,
          confidenceScore: 0,
          reason: `Gemini API HTTP ${status}`,
        },
        isMatchingAmount: false,
        isMatchingReceiver: false,
        isAutoApprovable: false,
        summaryText: `เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini API (${status}) — รอตรวจด้วยมือ`,
      };
    }

    const jsonRes = await res.json();
    const parts: any[] = jsonRes.candidates?.[0]?.content?.parts || [];
    const candidateText =
      parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim() || "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(candidateText);
    } catch {
      // Fallback regex extract JSON block
      const match = candidateText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const detectedAmount = typeof parsed.amountThb === "number" ? parsed.amountThb : Number(parsed.amountThb) || null;
    const isMatchingAmount = detectedAmount !== null && Math.abs(detectedAmount - expectedAmount) < 0.01;
    const isMatchingReceiver = checkReceiverMatch(parsed.receiverAccountOrName, targetPromptPay);
    const isMatchingTime = checkTransferTime(parsed.transferredAt || null, orderCreatedAt);
    const isValidSlip = parsed.isValidSlip === true;
    // Missing confidence means "unknown", never "confident".
    const confidence = typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0;

    const isAutoApprovable =
      isValidSlip &&
      isMatchingAmount &&
      isMatchingReceiver &&
      isMatchingTime &&
      confidence >= 0.8;

    let summaryText = "";
    if (isAutoApprovable) {
      summaryText = `AI ตรวจสอบผ่าน (ยอด ${detectedAmount} ฿ ตรง, ผู้รับตรง, เวลาโอนสมเหตุสมผล, มั่นใจ ${Math.round(confidence * 100)}%)`;
    } else {
      const issues: string[] = [];
      if (!isValidSlip) issues.push("ไม่ใช่ภาพสลิปที่ถูกต้อง");
      if (!isMatchingAmount) issues.push(`ยอดไม่ตรง (ตรวจพบ ${detectedAmount ?? "N/A"} ฿ แต่ยอดที่ต้องชำระคือ ${expectedAmount} ฿)`);
      if (!isMatchingReceiver) issues.push(`บัญชีผู้รับไม่ตรงกับบัญชีงาน (${parsed.receiverAccountOrName || "ไม่พบ"})`);
      if (!isMatchingTime) issues.push(`เวลาโอนไม่สอดคล้องกับเวลาสั่งซื้อ (${parsed.transferredAt || "ไม่พบเวลา"})`);
      if (confidence < 0.8) issues.push("ความมั่นใจต่ำ");
      summaryText = `AI แนะนำให้ตรวจสอบด้วยมือ: ${issues.join(", ")}`;
    }

    const analysis: SlipAnalysis = {
      isValidSlip,
      bankName: parsed.bankName || null,
      senderName: parsed.senderName || null,
      receiverAccountOrName: parsed.receiverAccountOrName || null,
      transferredAt: parsed.transferredAt || null,
      amountThb: detectedAmount,
      transactionRef: parsed.transactionRef || null,
      confidenceScore: confidence,
      reason: parsed.notes || undefined,
      rawText: candidateText,
    };

    return {
      analysis,
      isMatchingAmount,
      isMatchingReceiver,
      isAutoApprovable,
      summaryText,
    };
  } catch (err: any) {
    console.error("AI slip verification exception:", err);
    return {
      analysis: {
        isValidSlip: true,
        bankName: null,
        senderName: null,
        receiverAccountOrName: null,
        transferredAt: null,
        amountThb: null,
        transactionRef: null,
        confidenceScore: 0,
        reason: err.message || "Unknown verification error",
      },
      isMatchingAmount: false,
      isMatchingReceiver: false,
      isAutoApprovable: false,
      summaryText: `เกิดข้อผิดพลาดในการวิเคราะห์สลิป: ${err.message}`,
    };
  }
}
