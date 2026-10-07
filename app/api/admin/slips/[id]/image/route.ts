import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const paymentId = resolvedParams.id;

    let slipPath: string | null = null;

    if (engine.isSupabaseReady()) {
      const { data: payment, error } = await supabaseAdmin
        .from("payments")
        .select("id, slip_path")
        .eq("id", paymentId)
        .maybeSingle();

      if (!error && payment?.slip_path) {
        slipPath = payment.slip_path;
      }
    }

    if (!slipPath) {
      // In-memory fallback
      for (const p of (engine as any).payments.values()) {
        if (p.id === paymentId && p.slip_path) {
          slipPath = p.slip_path;
          break;
        }
      }
    }

    if (!slipPath) {
      return NextResponse.json({ error: "Slip not found" }, { status: 404 });
    }

    if (engine.isSupabaseReady()) {
      let { data: signedData, error: signErr } = await supabaseAdmin.storage
        .from("Slips")
        .createSignedUrl(slipPath, 3600);

      if (signErr || !signedData?.signedUrl) {
        const res2 = await supabaseAdmin.storage
          .from("slips")
          .createSignedUrl(slipPath, 3600);
        if (res2.data?.signedUrl) {
          signedData = res2.data;
          signErr = null;
        }
      }

      if (!signErr && signedData?.signedUrl) {
        return NextResponse.redirect(signedData.signedUrl, 307);
      }
    }

    return NextResponse.json(
      { error: "Could not generate slip URL" },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load slip image" },
      { status: 500 }
    );
  }
}
