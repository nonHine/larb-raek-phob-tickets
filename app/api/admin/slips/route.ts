import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allPayments: any[] = [];

    // Collect all pending payments
    for (const p of engine.payments.values()) {
      if (p.status === "pending") {
        const order = await engine.getOrderById(p.order_id);
        if (!order) continue;

        const orderPayments = await engine.getPaymentsForOrder(order.id);
        const approvedAmount = orderPayments
          .filter((item) => item.status === "approved")
          .reduce((sum, item) => sum + Number(item.amount_thb), 0);
        const remainingAmount = Math.max(0, order.total_thb - approvedAmount);

        // Duplicate checks: check if any other payment has same sha256 or (amount + transferred_at)
        let duplicateMatches: any[] = [];
        for (const other of engine.payments.values()) {
          if (other.id !== p.id) {
            if (
              other.slip_sha256 === p.slip_sha256 ||
              (Number(other.amount_thb) === Number(p.amount_thb) &&
                other.transferred_at === p.transferred_at)
            ) {
              const otherOrder = await engine.getOrderById(other.order_id);
              duplicateMatches.push({
                payment_id: other.id,
                order_code: otherOrder?.code,
                status: other.status,
                reason:
                  other.slip_sha256 === p.slip_sha256
                    ? "ไฟล์สลิปตรงกัน (SHA-256 ซ้ำ)"
                    : "ยอดเงินและเวลาโอนตรงกันเป๊ะ",
              });
            }
          }
        }

        allPayments.push({
          payment: p,
          order: {
            id: order.id,
            code: order.code,
            buyer_name: order.buyer_name,
            phone: order.phone,
            email: order.email,
            quantity: order.quantity,
            total_thb: order.total_thb,
            approved_amount: approvedAmount,
            remaining_amount: remainingAmount,
            created_at: order.created_at,
          },
          duplicates: duplicateMatches,
        });
      }
    }

    // Sort oldest first
    allPayments.sort(
      (a, b) =>
        new Date(a.payment.created_at).getTime() -
        new Date(b.payment.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      count: allPayments.length,
      queue: allPayments,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load slip queue" },
      { status: 500 }
    );
  }
}
