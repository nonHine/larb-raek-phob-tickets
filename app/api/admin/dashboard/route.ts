import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await engine.getDashboardStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
