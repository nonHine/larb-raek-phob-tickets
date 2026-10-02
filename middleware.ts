import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Whitelist public auth routes and static assets
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Protect Admin Web Pages (/admin and /admin/*)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const sessionCookie = req.cookies.get("staff_session")?.value;
    const { valid, role } = parseSessionToken(sessionCookie);

    if (!valid || !role) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role check: scanner role trying to access admin dashboard -> redirect to scan page
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/staff/scan", req.url));
    }

    return NextResponse.next();
  }

  // 3. Protect Staff Web Pages (/staff and /staff/*)
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    const sessionCookie = req.cookies.get("staff_session")?.value;
    const { valid, role } = parseSessionToken(sessionCookie);

    if (!valid || !role) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Both 'admin' and 'scanner' roles can access staff scanner
    return NextResponse.next();
  }

  // 4. Protect Admin API Routes (/api/admin/*)
  if (pathname.startsWith("/api/admin/")) {
    const sessionCookie = req.cookies.get("staff_session")?.value;
    const { valid, role } = parseSessionToken(sessionCookie);

    if (!valid || role !== "admin") {
      return NextResponse.json(
        {
          error: "unauthorized",
          message: "ต้องใช้สิทธิ์ Admin PIN ในการดำเนินการนี้",
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // 5. Protect Staff API Routes (/api/staff/*)
  if (pathname.startsWith("/api/staff/")) {
    const sessionCookie = req.cookies.get("staff_session")?.value;
    const { valid, role } = parseSessionToken(sessionCookie);

    if (!valid || !role) {
      return NextResponse.json(
        {
          error: "unauthorized",
          message: "ต้องใช้สิทธิ์ Staff หรือ Admin PIN ในการดำเนินการนี้",
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/api/admin/:path*",
    "/api/staff/:path*",
  ],
};
