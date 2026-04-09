import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { createSignedCookieValue } from "@/lib/signed-cookie";

const bodySchema = z.object({
  tenant: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_TENANT" }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ ok: false, error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  const tenant = parsed.data.tenant.toLowerCase();
  const value = createSignedCookieValue({ tenant }, secret, 10 * 60 * 1000);
  const cookieStore = await cookies();
  cookieStore.set("line_auth_ctx", value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  cookieStore.delete("line_auth_user");

  return NextResponse.json({ ok: true });
}
