import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    let order = await engine.getOrderById(orderId);
    if (!order) {
      order = await engine.getOrderByCode(orderId);
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const [rawPayments, tickets] = await Promise.all([
      engine.getPaymentsForOrder(order.id),
      engine.getTicketsForOrder(order.id),
    ]);

    const payments = await Promise.all(
      rawPayments.map(async (p) => {
        let slipUrl = p.slip_url || null;
        if (!slipUrl && p.slip_path && engine.isSupabaseReady()) {
          try {
            let { data: signedData, error: signErr } = await supabaseAdmin.storage
              .from("Slips")
              .createSignedUrl(p.slip_path, 3600);
            if (signErr || !signedData?.signedUrl) {
              const res2 = await supabaseAdmin.storage
                .from("slips")
                .createSignedUrl(p.slip_path, 3600);
              if (res2.data?.signedUrl) {
                signedData = res2.data;
              }
            }
            if (signedData?.signedUrl) {
              slipUrl = signedData.signedUrl;
            }
          } catch {
            // fallback
          }
        }
        return {
          ...p,
          slip_url: slipUrl || (p.slip_path ? `/api/admin/slips/${p.id}/image` : null),
        };
      })
    );

    let auditLogs: any[] = [];
    if (engine.isSupabaseReady()) {
      try {
        const { data } = await supabaseAdmin
          .from("audit_log")
          .select("*")
          .or(`entity_id.eq.${order.id},meta->>order_code.eq.${order.code}`)
          .order("created_at", { ascending: false })
          .limit(20);
        auditLogs = data || [];
      } catch {
        // keep empty
      }
    }

    return NextResponse.json({
      success: true,
      order,
      payments,
      tickets,
      audit_logs: auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load order details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;
    const body = await req.json();

    const { buyer_name, phone, email, admin_note, staff_id } = body;
    const actor = staff_id || "staff-admin";

    const updatedOrder = await engine.updateCustomerDetails(
      orderId,
      {
        buyer_name,
        phone,
        email,
        admin_note,
      },
      actor
    );

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update customer details" },
      { status: 500 }
    );
  }
}
