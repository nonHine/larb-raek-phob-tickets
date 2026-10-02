import { NextResponse } from "next/server";
import { checkPin, generateSessionToken, parseSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;
  lastAttemptAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  pinRateLimits?: Map<string, RateLimitEntry>;
};
const rateLimits =
  globalForRateLimit.pinRateLimits ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.pinRateLimits = rateLimits;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

// POST /api/auth/staff-pin -> Verify PIN and set session cookie
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = rateLimits.get(ip);

    // Check if IP is currently locked out
    if (entry && entry.lockedUntil > now) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((entry.lockedUntil - now) / 60000)
      );
      return NextResponse.json(
        {
          error: "rate_limited",
          message: `คุณใส่รหัส PIN ผิดเกินจำนวนครั้งที่กำหนด บัญชีถูกระงับชั่วคราว กรุณารออีก ${remainingMinutes} นาที`,
          retry_after_minutes: remainingMinutes,
        },
        { status: 429 }
      );
    }

    const { pin } = await req.json().catch(() => ({}));
    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "missing_pin", message: "กรุณาระบุรหัส PIN" },
        { status: 400 }
      );
    }

    const { valid, role } = checkPin(pin.trim());
    if (!valid || !role) {
      // Record failed attempt
      const attempts =
        ((entry && entry.lockedUntil <= now ? entry.attempts : 0) || 0) + 1;
      const lockedUntil =
        attempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0;

      rateLimits.set(ip, {
        attempts,
        lockedUntil,
        lastAttemptAt: now,
      });

      if (lockedUntil > 0) {
        return NextResponse.json(
          {
            error: "rate_limited",
            message:
              "คุณใส่รหัส PIN ผิดครบ 5 ครั้ง บัญชีถูกระงับชั่วคราวเป็นเวลา 10 นาที",
            retry_after_minutes: 10,
          },
          { status: 429 }
        );
      }

      const remainingTries = MAX_FAILED_ATTEMPTS - attempts;
      return NextResponse.json(
        {
          error: "invalid_pin",
          message: `รหัส PIN ไม่ถูกต้อง (เหลือโอกาสลองอีก ${remainingTries} ครั้ง)`,
          remaining_attempts: remainingTries,
        },
        { status: 401 }
      );
    }

    // Success: clear rate limit record
    rateLimits.delete(ip);

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
