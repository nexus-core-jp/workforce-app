import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/admin",
  "/dashboard",
  "/super-admin",
  "/leave-requests",
  "/daily-reports",
  "/corrections",
  "/suspended",
];

export async function proxy(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === "https:";
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });
  const { pathname } = req.nextUrl;

  // Unauthenticated users accessing protected routes → redirect to login
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!token) return NextResponse.next();

  const role = token.role as string | undefined;
  const plan = token.plan as string | undefined;

  // SUPER_ADMIN bypasses all plan checks
  if (role === "SUPER_ADMIN") return NextResponse.next();

  // SUSPENDED → redirect to /suspended
  if (plan === "SUSPENDED" && pathname !== "/suspended") {
    return NextResponse.redirect(new URL("/suspended", req.url));
  }

  // TRIAL with expired trial → redirect to /suspended
  if (plan === "TRIAL") {
    const trialEndsAt = token.trialEndsAt as string | null;
    if (trialEndsAt && new Date(trialEndsAt).getTime() < Date.now()) {
      if (req.nextUrl.pathname !== "/suspended") {
        return NextResponse.redirect(new URL("/suspended", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon-.*|manifest\\.json|api/auth|api/line|api/stripe/webhook|api/payjp/webhook|api/health|login|register|forgot-password|reset-password|verify-email|suspended).*)",
  ],
};
