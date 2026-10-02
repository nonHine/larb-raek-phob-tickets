import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";
import { getVerifiedStaffSession } from "@/lib/auth";

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
    // SEC-001 Fix: Enforce verified Admin session on POST
    const session = await getVerifiedStaffSession(req);
    if (!session.valid || session.role !== "admin") {
      return NextResponse.json(
        {
          error: "unauthorized",
          message: "ต้องใช้สิทธิ์ Admin PIN ในการเปลี่ยนสถานะร้านค้า",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { is_full } = body;

    if (typeof is_full !== "boolean") {
      return NextResponse.json(
        { error: "is_full must be boolean" },
        { status: 400 }
      );
    }

    const updated = await engine.setVenueFull(is_full, session.staffId);

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
