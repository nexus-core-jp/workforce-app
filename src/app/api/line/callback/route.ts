import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { toSessionUser } from "@/lib/session";

const registerDataSchema = z.object({
  companyName: z.string().min(1),
  slug: z.string().min(2).max(32).regex(/^[a-z0-9_-]+$/),
  adminName: z.string().min(1),
  email: z.string().email(),
});

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function exchangeCodeForProfile(code: string, redirectUri: string) {
  const tokenReqInit: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINE_CHANNEL_ID!,
      client_secret: process.env.LINE_CHANNEL_SECRET!,
    }),
  };
  let tokenRes = await fetchWithTimeout("https://api.line.me/oauth2/v2.1/token", tokenReqInit, 8000).catch(() => null);
  if (!tokenRes?.ok) {
    tokenRes = await fetchWithTimeout("https://api.line.me/oauth2/v2.1/token", tokenReqInit, 8000).catch(() => null);
  }

  if (!tokenRes?.ok) return null;
  const tokenData = await tokenRes.json();

  let profileRes = await fetchWithTimeout("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  }, 8000).catch(() => null);
  if (!profileRes?.ok) {
    profileRes = await fetchWithTimeout("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }, 8000).catch(() => null);
  }

  if (!profileRes?.ok) return null;
  return profileRes.json() as Promise<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  }>;
}

/**
 * GET /api/line/callback?code=...&state=...
 *
 * Handles LINE OAuth callback for two modes:
 * - "register": Creates company + user with lineId (LINE-only registration)
 * - "link": Links LINE to an existing authenticated user
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // User denied LINE authorization
  if (errorParam) {
    return NextResponse.redirect(new URL("/register?error=LINE_DENIED", request.url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("line_link_state")?.value;
  const mode = cookieStore.get("line_link_mode")?.value ?? "link";

  // Clean up state cookies
  cookieStore.delete("line_link_state");
  cookieStore.delete("line_link_mode");

  // CSRF check
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=INVALID_STATE", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=NO_CODE", request.url));
  }

  const authUrl = process.env.AUTH_URL ?? "http://localhost:3002";
  const redirectUri = `${authUrl}/api/line/callback`;
  const profile = await exchangeCodeForProfile(code, redirectUri);

  if (!profile) {
    return NextResponse.redirect(new URL("/login?error=LINE_TOKEN_ERROR", request.url));
  }

  const lineId = profile.userId;

  // --- MODE: REGISTER ---
  if (mode === "register") {
    return handleRegister(request, lineId, cookieStore);
  }

  // --- MODE: LINK (existing user) ---
  return handleLink(request, lineId);
}

async function handleRegister(
  request: Request,
  lineId: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  const rawCookie = cookieStore.get("line_register")?.value;
  cookieStore.delete("line_register");

  if (!rawCookie) {
    return NextResponse.redirect(new URL("/register?error=MISSING_DATA", request.url));
  }

  let regData: z.infer<typeof registerDataSchema>;
  try {
    regData = registerDataSchema.parse(JSON.parse(decodeURIComponent(rawCookie)));
  } catch {
    return NextResponse.redirect(new URL("/register?error=INVALID_DATA", request.url));
  }

  // Check slug uniqueness
  const existing = await prisma.tenant.findUnique({ where: { slug: regData.slug } });
  if (existing) {
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent("この会社IDは既に使用されています")}`, request.url),
    );
  }

  // Check if this LINE ID is already linked to someone
  const existingLineUser = await prisma.user.findFirst({ where: { lineId } });
  if (existingLineUser) {
    return NextResponse.redirect(
      new URL("/register?error=LINE_ALREADY_USED", request.url),
    );
  }

  // Create company + admin user with LINE ID
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  // Generate a random placeholder password hash (user has no password; they use LINE)
  const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 10);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: regData.companyName,
        slug: regData.slug,
        plan: "TRIAL",
        trialEndsAt,
      },
    });

    const adminUser = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: regData.email,
        name: regData.adminName,
        role: "ADMIN",
        passwordHash: placeholderHash,
        lineId,
      },
    });

    // Also create Account record so LINE webhook punch works
    await tx.account.create({
      data: {
        userId: adminUser.id,
        type: "oauth",
        provider: "line",
        providerAccountId: lineId,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: adminUser.id,
        action: "TENANT_REGISTERED_LINE",
        entityType: "Tenant",
        entityId: tenant.id,
        afterJson: {
          companyName: regData.companyName,
          slug: regData.slug,
          adminEmail: regData.email,
          authMethod: "line",
        },
      },
    });
  });

  // Fire-and-forget welcome email
  sendWelcomeEmail(regData.email, regData.adminName, regData.companyName, regData.slug, "line").catch((err) => {
    console.error("[line-register] welcome email failed:", err);
  });

  // Redirect to login with success message
  return NextResponse.redirect(
    new URL("/login?registered=line", request.url),
  );
}

async function handleLink(request: Request, lineId: string) {
  const session = await auth();
  const user = session?.user ? toSessionUser(session.user as Record<string, unknown>) : null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check if this LINE ID is already linked to another user
  const existingLineUser = await prisma.user.findFirst({
    where: { lineId, NOT: { id: user.id } },
  });
  if (existingLineUser) {
    return NextResponse.redirect(new URL("/dashboard?error=LINE_ALREADY_LINKED", request.url));
  }

  // Save lineId to current user
  await prisma.user.update({
    where: { id: user.id },
    data: { lineId },
  });

  // Audit log
  prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "LINE_ACCOUNT_LINKED",
      entityType: "User",
      entityId: user.id,
    },
  }).catch(() => {});

  return NextResponse.redirect(new URL("/dashboard?line_linked=true", request.url));
}
