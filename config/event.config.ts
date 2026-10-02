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
  startsAt: "9 พ.ย. 2026 เวลา 16:00 น.",
  doorsOpenAt: "16:00 น.",
  orderCodePrefix: "LRP",
  ticketPriceThb: 49,
  maxTicketsPerOrder: 100,
  orderExpiryMinutes: 30,
  banks: [
    {
      bank: "ธนาคารกสิกรไทย", // TODO(owner)
      accountName: "นายรามณรงค์ชัย จันต๊ะภา", // TODO(owner)
      accountNo: "2218954758", // TODO(owner)
    },
  ],
  branding: {
    primary: "#8F1D2D",
    primaryPressed: "#741725",
    logoPath: "/Logo.jpg",
    slogan: "ดนตรีสด ลาบก้อย บรรยากาศเป็นกันเอง",
  },
};
