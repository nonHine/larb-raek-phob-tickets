import { afterEach, describe, expect, it, vi } from "vitest";

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
}));

vi.mock("@/lib/supabase", () => ({ supabaseAdmin: supabaseMock }));

import { OrderEngine } from "@/lib/engine";

const originalEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

afterEach(() => {
  if (originalEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.url;
  if (originalEnv.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.key;
  vi.clearAllMocks();
});

describe("Supabase-backed reads do not fall back to stale memory", () => {
  it("does not return cached pending order when the database has no matching row", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    const cachedOrder = {
      id: "order-1",
      code: "LRP-12345",
      access_token: "token",
      status: "pending_payment",
    };
    const orderQuery = {
      select: () => orderQuery,
      eq: () => orderQuery,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    supabaseMock.from.mockReturnValue(orderQuery);
    const engine = new OrderEngine();
    engine.orders.set(cachedOrder.id, cachedOrder as any);

    await expect(engine.getOrderByCode(cachedOrder.code, "token")).resolves.toBeNull();
  });

  it("does not return cached tickets when the database reports no issued tickets", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    const ticketQuery = {
      select: () => ticketQuery,
      eq: async () => ({ data: [], error: null }),
    };
    supabaseMock.from.mockReturnValue(ticketQuery);
    const engine = new OrderEngine();
    engine.tickets.set("ticket-1", {
      id: "ticket-1",
      order_id: "order-1",
      code: "TICKETCODE0000001",
      holder_name: "ผู้ซื้อ",
      status: "issued",
      checked_in_at: null,
      checked_in_by: null,
      created_at: new Date().toISOString(),
    });

    await expect(engine.getTicketsForOrder("order-1")).resolves.toEqual([]);
  });

  it("fails closed when the database read for tickets fails", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    const ticketQuery = {
      select: () => ticketQuery,
      eq: async () => ({ data: null, error: new Error("database unavailable") }),
    };
    supabaseMock.from.mockReturnValue(ticketQuery);
    const engine = new OrderEngine();

    await expect(engine.getTicketsForOrder("order-1")).rejects.toThrow("database unavailable");
  });
});
