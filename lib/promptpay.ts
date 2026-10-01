import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

export function generatePromptPayPayload(
  recipientId: string,
  amount: number
): string {
  // Pre-fills PromptPay QR with exact amount
  return generatePayload(recipientId, { amount });
}

export async function generateQrDataUrl(
  text: string,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: options?.width || 320,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    ...options,
  });
}
