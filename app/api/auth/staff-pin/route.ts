import { NextResponse } from "next/server";
import { checkPin, generateSessionToken, parseSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/staff-pin -> Verify PIN and set session cookie
export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "missing_pin", message: "กรุณาระบุรหัส PIN" },
        { status: 400 }
      );
    }

    const { valid, role } = checkPin(pin);
    if (!valid || !role) {
      return NextResponse.json(
        { error: "invalid_pin", message: "รหัส PIN ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const token = generateSessionToken(role);
    const redirectUrl = role === "admin" ? "/admin" : "/staff/scan";

    const res = NextResponse.json({
      success: true,
      message: `เข้าสู่ระบบสำเร็จในฐานะ ${role === "admin" ? "แอดมิน" : "สตาฟ"}`,
      role,
      redirect_url: redirectUrl,
    });

    // 7 days expiration
    res.cookies.set("staff_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process login" },
      { status: 500 }
    );
  }
}

// GET /api/auth/staff-pin -> Check current session
export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/staff_session=([^;]+)/);
  const token = match ? match[1] : null;

  const { valid, role } = parseSessionToken(token);
  if (!valid || !role) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    role,
  });
}

// DELETE /api/auth/staff-pin -> Logout
export async function DELETE() {
  const res = NextResponse.json({
    success: true,
    message: "ออกจากระบบเรียบร้อยแล้ว",
  });

  res.cookies.set("staff_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
