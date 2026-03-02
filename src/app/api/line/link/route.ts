import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { toSessionUser } from "@/lib/session";

/**
 * GET /api/line/link?mode=register|link
 *
 * Starts the LINE OAuth flow for:
 * - "register": linking LINE during new company registration
 * - "link" (default): linking LINE for an already-authenticated user
 */
export async function GET(request: Request) {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json(
      { error: "LINE連携は現在利用できません" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "link";

  // For "link" mode, user must be authenticated
  if (mode === "link") {
    const session = await auth();
    const user = session?.user ? toSessionUser(session.user as Record<string, unknown>) : null;
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Generate a CSRF state token
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("line_link_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  cookieStore.set("line_link_mode", mode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  const authUrl = process.env.AUTH_URL ?? "http://localhost:3002";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: `${authUrl}/api/line/callback`,
    state,
    scope: "profile openid",
  });

  return NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`,
  );
}
