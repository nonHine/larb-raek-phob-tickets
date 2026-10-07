import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = engine.getAiSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to get AI settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body.autoApprove !== "boolean") {
      return NextResponse.json(
        { error: "autoApprove must be a boolean" },
        { status: 400 }
      );
    }

    const updated = engine.setAiSettings({ autoApprove: body.autoApprove });
    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update AI settings" },
      { status: 500 }
    );
  }
}
