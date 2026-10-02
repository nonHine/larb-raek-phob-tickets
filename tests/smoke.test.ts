import { describe, it, expect } from "vitest";
import { EVENT } from "@/config/event.config";

describe("Scaffold & Event Config", () => {
  it("should have correct initial event configuration", () => {
    expect(EVENT.name).toBe("งานลาบแรกพบ");
    expect(EVENT.ticketPriceThb).toBe(49);
    expect(EVENT.maxTicketsPerOrder).toBe(100);
    expect(EVENT.orderExpiryMinutes).toBe(30);
    expect(EVENT.branding.primary).toBe("#8F1D2D");
  });
});
