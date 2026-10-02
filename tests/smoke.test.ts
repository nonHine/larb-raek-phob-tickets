import { describe, it, expect } from "vitest";
import { EVENT } from "@/config/event.config";

describe("Scaffold & Event Config", () => {
  it("should have correct initial event configuration for Event 2", () => {
    expect(EVENT.name).toBe("งานลาบแรกพบ ครั้งที่ 2");
    expect(EVENT.venue).toBe("ร้านลาบก้อยซอยนานา สาขาหลัง มข. (ตรงข้าม Cafe Amazon • มีที่จอดรถ)");
    expect(EVENT.startsAt).toBe("วันพุธที่ 7 ตุลาคม 2026 เวลา 19:00–00:00 น.");
    expect(EVENT.doorsOpenAt).toBe("19:00 น.");
    expect(EVENT.ticketPriceThb).toBe(49);
    expect(EVENT.maxTicketsPerOrder).toBe(100);
    expect(EVENT.orderExpiryMinutes).toBe(30);
    expect(EVENT.branding.primary).toBe("#8F1D2D");
  });

  it("calculates ticket prices correctly based on 49 THB unit price", () => {
    const calculateTotal = (quantity: number) => quantity * EVENT.ticketPriceThb;
    expect(calculateTotal(1)).toBe(49);
    expect(calculateTotal(2)).toBe(98);
    expect(calculateTotal(3)).toBe(147);
    expect(calculateTotal(5)).toBe(245);
    expect(calculateTotal(10)).toBe(490);
    expect(calculateTotal(100)).toBe(4900);
  });
});
