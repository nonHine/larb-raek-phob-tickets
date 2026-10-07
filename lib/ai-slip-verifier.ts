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
 * Checks if the detected receiver text matches any known event account identifiers
 */
export function checkReceiverMatch(
  receiverText: string | null,
  targetPromptPay: string = process.env.PROMPTPAY_ID || "0812345678"
): boolean {
  if (!receiverText) return false;
  const clean = receiverText.replace(/[\s-]/g, "").toLowerCase();

  // 1. Check promptpay ID
  const cleanPromptPay = targetPromptPay.replace(/[\s-]/g, "").toLowerCase();
  if (clean.includes(cleanPromptPay)) return true;

  // 2. Check bank account numbers from EVENT config
  for (const b of EVENT.banks) {
    const cleanAcc = b.accountNo.replace(/[\s-]/g, "");
    if (clean.includes(cleanAcc)) return true;
    // Check last 4-6 digits of account
    if (cleanAcc.length >= 4 && clean.includes(cleanAcc.slice(-5))) return true;

    // Check account holder name keywords
    const nameKeywords = b.accountName.split(/\s+/).filter(Boolean);
    for (const kw of nameKeywords) {
      if (kw.length >= 3 && receiverText.includes(kw)) return true;
    }
  }

  // 3. Check event name and account holder keywords (Thai and English)
  const lower = receiverText.toLowerCase();
  const knownKeywords = [
    "ผู้จัดงาน",
    "ทางการ",
    "ลาบ",
    "hatsanan",
    "taosing",
    "nonhi",
    "larb",
  ];
  for (const kw of knownKeywords) {
    if (lower.includes(kw)) return true;
  }

  return false;
}

/**
 * Verify slip image using Google Gemini Multimodal Vision API
 */
export async function verifySlipWithAI(params: {
  buffer: Buffer;
  mimeType: string;
  expectedAmount: number;
  targetPromptPay?: string;
}): Promise<VerificationResult> {
  const { buffer, mimeType, expectedAmount, targetPromptPay } = params;

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
  "receiverAccountOrName": "Name or Account No or PromptPay number of receiver or null",
  "transferredAt": "ISO date string or datetime text on slip or null",
  "amountThb": numeric transfer amount in THB (e.g. 49.00 or 98.00) or null,
  "transactionRef": "Bank transaction reference number or null",
  "confidenceScore": confidence number from 0.0 to 1.0,
  "notes": "Any anomalies, e.g. blurry image, edited fonts, missing QR code"
}
`;

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
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

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Gemini API error (${res.status}):`, errBody);
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
          reason: `Gemini API HTTP ${res.status}`,
        },
        isMatchingAmount: false,
        isMatchingReceiver: false,
        isAutoApprovable: false,
        summaryText: `เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini API (${res.status})`,
      };
    }

    const jsonRes = await res.json();
    const candidateText =
      jsonRes.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(candidateText.trim());
    } catch {
      // Fallback regex extract JSON block
      const match = candidateText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const detectedAmount = typeof parsed.amountThb === "number" ? parsed.amountThb : Number(parsed.amountThb) || null;
    const isMatchingAmount = detectedAmount !== null && Math.abs(detectedAmount - expectedAmount) < 0.01;
    const isMatchingReceiver = checkReceiverMatch(parsed.receiverAccountOrName, targetPromptPay);
    const isValidSlip = Boolean(parsed.isValidSlip);
    const confidence = typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.8;

    const isAutoApprovable =
      isValidSlip &&
      isMatchingAmount &&
      isMatchingReceiver &&
      confidence >= 0.8;

    let summaryText = "";
    if (isAutoApprovable) {
      summaryText = `AI ตรวจสอบผ่านสมบูรณ์ (ยอด ${detectedAmount} ฿ ตรงเป๊ะ, ผู้รับตรง, มั่นใจ ${Math.round(confidence * 100)}%)`;
    } else {
      const issues: string[] = [];
      if (!isValidSlip) issues.push("ไม่ใช่ภาพสลิปที่ถูกต้อง");
      if (!isMatchingAmount) issues.push(`ยอดไม่ตรง (ตรวจพบ ${detectedAmount ?? "N/A"} ฿ แต่ยอดที่ต้องชำระคือ ${expectedAmount} ฿)`);
      if (!isMatchingReceiver) issues.push(`บัญชีผู้รับไม่ตรงกับบัญชีงาน (${parsed.receiverAccountOrName || "ไม่พบ"})`);
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
