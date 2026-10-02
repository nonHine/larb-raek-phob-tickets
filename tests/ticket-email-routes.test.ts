import { beforeEach, describe, expect, it, vi } from "vitest";

const { engineMock, sendEmailMock } = vi.hoisted(() => ({
  engineMock: {
    approvePayment: vi.fn(),
    getTicketsForOrder: vi.fn(),
    getOrdersByPhone: vi.fn(),
    getOrderByCode: vi.fn(),
  },
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/engine", () => ({ engine: engineMock }));
vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));

import { POST as approveSlip } from "@/app/api/admin/slips/[id]/approve/route";
import { POST as lookupOrder } from "@/app/api/orders/lookup/route";

const order = {
  id: "order-1",
  code: "LRP-12345",
  access_token: "private-token",
  buyer_name: "ผู้ซื้อ",
  phone: "0812345678",
  email: "buyer@example.test",
  quantity: 2,
  total_thb: 40,
  status: "paid",
};
const issuedTickets = [
  { id: "ticket-1", order_id: order.id, code: "TICKETCODE0000001", status: "issued" },
  { id: "ticket-2", order_id: order.id, code: "TICKETCODE0000002", status: "issued" },
];

beforeEach(() => {
  vi.clearAllMocks();
  engineMock.getTicketsForOrder.mockResolvedValue(issuedTickets);
  sendEmailMock.mockResolvedValue(true);
});

function request(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("ticket email route triggers", () => {
  it("sends QR email after final approval issues tickets", async () => {
    engineMock.approvePayment.mockResolvedValue({
      success: true,
      payment: { id: "payment-1" },
      order,
      ticketsIssued: 2,
    });

    const response = await approveSlip(request("https://example.test", {}), {
      params: { id: "payment-1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket_email_sent).toBe(true);
    expect(engineMock.getTicketsForOrder).toHaveBeenCalledWith(order.id);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: order.email,
        template: "paid",
        data: expect.objectContaining({ tickets: issuedTickets }),
      })
    );
  });

  it("does not send a QR before the order is fully paid", async () => {
    engineMock.approvePayment.mockResolvedValue({
      success: true,
      payment: { id: "payment-1" },
      order: { ...order, status: "under_review" },
      ticketsIssued: 0,
    });

    const response = await approveSlip(request("https://example.test", {}), {
      params: { id: "payment-1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order_status).toBe("under_review");
    expect(body.ticket_email_sent).toBeNull();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("keeps approval successful if the email provider fails", async () => {
    engineMock.approvePayment.mockResolvedValue({
      success: true,
      payment: { id: "payment-1" },
      order,
      ticketsIssued: 2,
    });
    sendEmailMock.mockResolvedValue(false);

    const response = await approveSlip(request("https://example.test", {}), {
      params: { id: "payment-1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order_status).toBe("paid");
    expect(body.ticket_email_sent).toBe(false);
  });

  it("resends all QR tickets through validated order lookup", async () => {
    engineMock.getOrdersByPhone.mockResolvedValue([order]);
    engineMock.getTicketsForOrder.mockResolvedValue(issuedTickets);

    const response = await lookupOrder(
      request("https://example.test", { phone: order.phone })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders[0].email_sent).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: order.email,
        template: "paid",
        data: expect.objectContaining({ tickets: issuedTickets }),
      })
    );
  });
});
