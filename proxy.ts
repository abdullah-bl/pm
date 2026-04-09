import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";


const publicRoutes = [
    "/sign-in",
]

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (publicRoutes.includes(path)) {
        return NextResponse.next();
    }

    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};