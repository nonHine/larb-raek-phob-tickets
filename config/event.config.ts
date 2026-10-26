export interface BankAccount {
  bank: string;
  accountName: string;
  accountNo: string;
  rawAccountNo?: string;
}

export interface PromptPayConfig {
  id: string;
  name: string;
  qrReference?: string;
}

export interface EventConfig {
  name: string;
  venue: string;
  startsAt: string | null;
  doorsOpenAt: string | null;
  orderCodePrefix: string;
  ticketPriceThb: number;
  maxTicketsPerOrder: number;
  orderExpiryMinutes: number;
  promptPay?: PromptPayConfig;
  banks: BankAccount[];
  branding: {
    primary: string; // #8F1D2D Deep red from UX-UI-SPEC
    primaryPressed: string; // #741725
    logoPath: string;
    slogan: string;
  };
}

export const EVENT: EventConfig = {
  name: "งานลาบแรกพบ ครั้งที่ 2",
  venue: "ร้านลาบก้อยซอยนานา สาขาหลัง มข. (ตรงข้าม Cafe Amazon • มีที่จอดรถ)",
  startsAt: "วันพุธที่ 7 ตุลาคม 2026 เวลา 19:00–00:00 น.",
  doorsOpenAt: "19:00 น.",
  orderCodePrefix: "LRP",
  ticketPriceThb: 49,
  maxTicketsPerOrder: 100,
  orderExpiryMinutes: 30,
  promptPay: {
    id: process.env.NEXT_PUBLIC_PROMPTPAY_ID || process.env.PROMPTPAY_ID || "081-234-5678",
    name: process.env.NEXT_PUBLIC_RECEIVER_NAME || "บัญชีทางการ งานลาบแรกพบ",
    qrReference: process.env.NEXT_PUBLIC_QR_REFERENCE || "000000000000000",
  },
  banks: [
    {
      bank: "ธนาคารกสิกรไทย",
      accountName: process.env.NEXT_PUBLIC_RECEIVER_NAME || "บัญชีทางการ งานลาบแรกพบ",
      accountNo: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO || "xxx-x-xxxxx-x",
      rawAccountNo: process.env.NEXT_PUBLIC_BANK_RAW_NO || "xxxxxxxxx",
    },
  ],
  branding: {
    primary: "#8F1D2D",
    primaryPressed: "#741725",
    logoPath: "/Logo.jpg",
    slogan: "ดนตรีสด Pop • Rock • Jazz • DJ ลาบก้อย บรรยากาศเป็นกันเอง",
  },
};
