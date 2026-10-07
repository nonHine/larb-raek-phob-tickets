import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const isSupabaseReady = () =>
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
  );

export async function GET() {
  try {
    if (isSupabaseReady()) {
      // 1. Pending payments from Supabase in 1 query
      const { data: pendingPayments, error: pErr } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (pErr) throw pErr;
      if (!pendingPayments || pendingPayments.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          queue: [],
        });
      }

      // Collect unique keys
      const orderIds = Array.from(
        new Set(pendingPayments.map((p) => p.order_id).filter(Boolean))
      );
      const shaList = Array.from(
        new Set(pendingPayments.map((p) => p.slip_sha256).filter(Boolean))
      );
      const pathsToSign = Array.from(
        new Set(
          pendingPayments
            .filter((p) => !p.slip_url && p.slip_path)
            .map((p) => p.slip_path as string)
        )
      );

      const orderMap = new Map<string, any>();
      const orderPaymentsMap = new Map<string, any[]>();
      const duplicatesBySha = new Map<string, any[]>();
      const signedUrlMap = new Map<string, string>();

      // 2. Fetch orders, all payments for these orders, duplicates, and signed URLs in parallel
      await Promise.all([
        (async () => {
          if (orderIds.length === 0) return;
          const { data: orders } = await supabaseAdmin
            .from("orders")
            .select("*")
            .in("id", orderIds);
          if (orders) {
            for (const o of orders) orderMap.set(o.id, o);
          }
        })(),

        (async () => {
          if (orderIds.length === 0) return;
          const { data: pmts } = await supabaseAdmin
            .from("payments")
            .select("*")
            .in("order_id", orderIds)
            .order("created_at", { ascending: true });
          if (pmts) {
            for (const p of pmts) {
              if (!orderPaymentsMap.has(p.order_id)) {
                orderPaymentsMap.set(p.order_id, []);
              }
              orderPaymentsMap.get(p.order_id)!.push(p);
            }
          }
        })(),

        (async () => {
          if (shaList.length === 0) return;
          const { data: dups } = await supabaseAdmin
            .from("payments")
            .select("*")
            .in("slip_sha256", shaList);
          if (dups) {
            for (const d of dups) {
              if (!duplicatesBySha.has(d.slip_sha256)) {
                duplicatesBySha.set(d.slip_sha256, []);
              }
              duplicatesBySha.get(d.slip_sha256)!.push(d);
            }
          }
        })(),

        (async () => {
          if (pathsToSign.length === 0) return;
          try {
            const { data: signedResults, error: signErr } =
              await supabaseAdmin.storage
                .from("Slips")
                .createSignedUrls(pathsToSign, 3600);
            if (signedResults && !signErr) {
              for (const res of signedResults) {
                const url = (res as any).signedUrl || (res as any).signedURL;
                if (res.path && url) {
                  signedUrlMap.set(res.path, url);
                }
              }
            }
          } catch {
            // fallback: parallel individual createSignedUrl
            await Promise.all(
              pathsToSign.map(async (path) => {
                try {
                  const { data } = await supabaseAdmin.storage
                    .from("Slips")
                    .createSignedUrl(path, 3600);
                  if (data?.signedUrl) signedUrlMap.set(path, data.signedUrl);
                } catch {
                  // ignore
                }
              })
            );
          }
        })(),
      ]);

      // Handle duplicate records that belong to orders not in orderIds
      const missingOrderIds = new Set<string>();
      for (const dups of duplicatesBySha.values()) {
        for (const other of dups) {
          if (other.order_id && !orderMap.has(other.order_id)) {
            missingOrderIds.add(other.order_id);
          }
        }
      }
      if (missingOrderIds.size > 0) {
        const { data: moreOrders } = await supabaseAdmin
          .from("orders")
          .select("*")
          .in("id", Array.from(missingOrderIds));
        if (moreOrders) {
          for (const o of moreOrders) orderMap.set(o.id, o);
        }
      }

      // Assemble allPayments
      const allPayments: any[] = [];
      for (const p of pendingPayments) {
        const order = orderMap.get(p.order_id);
        if (!order) continue;

        const orderPayments = orderPaymentsMap.get(order.id) || [];
        const approvedAmount = orderPayments
          .filter((item) => item.status === "approved")
          .reduce((sum, item) => sum + Number(item.amount_thb), 0);
        const remainingAmount = Math.max(0, order.total_thb - approvedAmount);

        let duplicateMatches: any[] = [];
        if (p.slip_sha256) {
          const dups = duplicatesBySha.get(p.slip_sha256) || [];
          for (const other of dups) {
            if (other.id !== p.id) {
              const otherOrder = orderMap.get(other.order_id);
              duplicateMatches.push({
                payment_id: other.id,
                order_code: otherOrder?.code,
                status: other.status,
                reason: "ไฟล์สลิปตรงกัน (SHA-256 ซ้ำ)",
              });
            }
          }
        }

        const slipUrl =
          p.slip_url || (p.slip_path ? signedUrlMap.get(p.slip_path) : null) || null;

        allPayments.push({
          payment: { ...p, slip_url: slipUrl },
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
          ai_analysis: engine.getAiAnalysis(p.id),
        });
      }

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
    }

    // Fallback for in-memory / unit-test mode
    const pendingPayments = await engine.getPendingPayments();
    const allPayments: any[] = [];

    for (const p of pendingPayments) {
      const order = await engine.getOrderById(p.order_id);
      if (!order) continue;

      const orderPayments = await engine.getPaymentsForOrder(order.id);
      const approvedAmount = orderPayments
        .filter((item) => item.status === "approved")
        .reduce((sum, item) => sum + Number(item.amount_thb), 0);
      const remainingAmount = Math.max(0, order.total_thb - approvedAmount);

      let duplicateMatches: any[] = [];
      if (p.slip_sha256) {
        const dups = await engine.findDuplicatePayments(p.slip_sha256);
        for (const other of dups) {
          if (other.id !== p.id) {
            const otherOrder = await engine.getOrderById(other.order_id);
            duplicateMatches.push({
              payment_id: other.id,
              order_code: otherOrder?.code,
              status: other.status,
              reason: "ไฟล์สลิปตรงกัน (SHA-256 ซ้ำ)",
            });
          }
        }
      }

      allPayments.push({
        payment: { ...p },
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
        ai_analysis: engine.getAiAnalysis(p.id),
      });
    }

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
