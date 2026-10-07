import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Whitelist static assets, next internal files, and images
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/placeholder/") ||
    pathname === "/Logo.jpg" ||
    pathname === "/logo.svg" ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // 2. All API routes return 410 Gone with Thai closed notice
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "event_closed",
        message: "ระบบปิดให้บริการแล้ว - งานลาบแรกพบ ครั้งที่ 2 สิ้นสุดลงเรียบร้อยแล้ว",
      },
      {
        status: 410,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  // 3. Root landing page displays the closed page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // 4. Any other page redirects directly to root (closed page)
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
