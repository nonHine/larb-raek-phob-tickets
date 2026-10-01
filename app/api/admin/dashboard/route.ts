import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let pendingPaymentCount = 0;
    let underReviewCount = 0;
    let paidCount = 0;
    let cancelledCount = 0;
    let confirmedRevenue = 0;

    for (const order of engine.orders.values()) {
      if (order.status === "pending_payment") pendingPaymentCount++;
      else if (order.status === "under_review") underReviewCount++;
      else if (order.status === "paid") paidCount++;
      else if (order.status === "cancelled") cancelledCount++;
    }

    for (const payment of engine.payments.values()) {
      if (payment.status === "approved") {
        confirmedRevenue += Number(payment.amount_thb);
      }
    }

    let ticketsIssued = 0;
    let ticketsCheckedIn = 0;

    for (const ticket of engine.tickets.values()) {
      if (ticket.status === "issued" || ticket.status === "checked_in") {
        ticketsIssued++;
      }
      if (ticket.status === "checked_in") {
        ticketsCheckedIn++;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total_orders: engine.orders.size,
        pending_payment_count: pendingPaymentCount,
        under_review_count: underReviewCount,
        paid_count: paidCount,
        cancelled_count: cancelledCount,
        confirmed_revenue_thb: confirmedRevenue,
        tickets_issued: ticketsIssued,
        tickets_checked_in: ticketsCheckedIn,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
