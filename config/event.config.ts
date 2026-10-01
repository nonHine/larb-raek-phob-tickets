export interface BankAccount {
  bank: string;
  accountName: string;
  accountNo: string;
}

export interface EventConfig {
  name: string;
  venue: string;
  startsAt: string | null; // TODO(owner): date/time shown on the site, e.g. "12 ต.ค. 2026 เวลา 18:00 น."
  doorsOpenAt: string | null; // TODO(owner): doors open time
  orderCodePrefix: string;
  ticketPriceThb: number;
  maxTicketsPerOrder: number; // technical sanity ceiling only
  orderExpiryMinutes: number; // display-only countdown shown to buyers
  banks: BankAccount[];
  branding: {
    primary: string; // #8F1D2D Deep red from UX-UI-SPEC
    primaryPressed: string; // #741725
    logoPath: string;
    slogan: string;
  };
}

export const EVENT: EventConfig = {
  name: "งานลาบแรกพบ",
  venue: "ร้านลาบก้อยซอยนานา (หลัง ม.ข.)",
  startsAt: null, // TODO(owner): วันและเวลาจัดงานจริง
  doorsOpenAt: null, // TODO(owner): เวลาเปิดประตู
  orderCodePrefix: "LRP",
  ticketPriceThb: 20,
  maxTicketsPerOrder: 100,
  orderExpiryMinutes: 30,
  banks: [
    {
      bank: "ธนาคารกสิกรไทย (ตัวอย่าง)", // TODO(owner)
      accountName: "นายสมชาย ใจดี (ตัวอย่าง)", // TODO(owner)
      accountNo: "xxx-x-xxxxx-x", // TODO(owner)
    },
  ],
  branding: {
    primary: "#8F1D2D",
    primaryPressed: "#741725",
    logoPath: "/logo.svg",
    slogan: "ดนตรีสด ลาบก้อย บรรยากาศเป็นกันเอง",
  },
};
