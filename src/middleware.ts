import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  // No session → let next-auth handle redirect
  if (!token) return NextResponse.next();

  const role = token.role as string | undefined;
  const plan = token.plan as string | undefined;

  // SUPER_ADMIN bypasses all plan checks
  if (role === "SUPER_ADMIN") return NextResponse.next();

  // SUSPENDED → redirect to /suspended
  if (plan === "SUSPENDED" && req.nextUrl.pathname !== "/suspended") {
    return NextResponse.redirect(new URL("/suspended", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon-.*|manifest\\.json|api/auth|api/stripe/webhook|login|register|forgot-password|reset-password|suspended).*)",
  ],
};
