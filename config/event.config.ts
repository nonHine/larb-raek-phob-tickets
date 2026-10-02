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
  name: "งานลาบแรกพบ ครั้งที่ 2",
  venue: "ร้านลาบก้อยซอยนานา สาขาหลัง มข. (ตรงข้าม Cafe Amazon • มีที่จอดรถ)",
  startsAt: "วันพุธที่ 7 ตุลาคม 2026 เวลา 19:00–00:00 น.",
  doorsOpenAt: "19:00 น.",
  orderCodePrefix: "LRP",
  ticketPriceThb: 49,
  maxTicketsPerOrder: 100,
  orderExpiryMinutes: 30,
  banks: [
    {
      bank: "ธนาคารกสิกรไทย",
      accountName: "ฮัศนัน ท้าวสิงห์",
      accountNo: "199-2-47161-8",
    },
  ],
  branding: {
    primary: "#8F1D2D",
    primaryPressed: "#741725",
    logoPath: "/Logo.jpg",
    slogan: "ดนตรีสด Pop • Rock • Jazz • DJ ลาบก้อย บรรยากาศเป็นกันเอง",
  },
};
