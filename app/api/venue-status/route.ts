import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await engine.getVenueStatus();
  return NextResponse.json(
    {
      is_full: status.is_full,
      updated_at: status.updated_at,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { is_full, staff_id } = body;

    if (typeof is_full !== "boolean") {
      return NextResponse.json(
        { error: "is_full must be boolean" },
        { status: 400 }
      );
    }

    const updated = await engine.setVenueFull(
      is_full,
      staff_id || "staff-anonymous"
    );

    return NextResponse.json({
      success: true,
      venue_status: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update venue status" },
      { status: 500 }
    );
  }
}
