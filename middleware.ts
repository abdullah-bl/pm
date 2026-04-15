import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const STAFF_ROLES = ["admin", "viewer", "procurement_manager", "budget_manager"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // Public routes
  if (pathname === "/sign-in" || pathname === "/login") {
    if (session) {
      const role = session.user.role ?? "user";
      if (STAFF_ROLES.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated users
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const role = session.user.role ?? "user";

  // Admin area protection
  if (pathname.startsWith("/dashboard")) {
    if (!STAFF_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // User area protection - staff users shouldn't access user routes
  if (!pathname.startsWith("/dashboard") && pathname !== "/sign-in") {
    if (STAFF_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
