import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const publicRoutes = ["/sign-in"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow API routes and static files
  if (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Non-admin users can't access /dashboard routes
  if (path.startsWith("/dashboard") && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin users on main app are fine - they can use both

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
