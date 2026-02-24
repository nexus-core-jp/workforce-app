import { NextResponse } from "next/server";

/**
 * Convenience helper for returning JSON error responses from API routes.
 */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
