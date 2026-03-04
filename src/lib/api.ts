import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ERROR_MESSAGES } from "./constants";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

/**
 * Convenience helper for returning JSON error responses from API routes.
 */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  departmentId: string | null;
}

type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: jsonError(ERROR_MESSAGES.UNAUTHORIZED, 401) };
  }

  const { id, email, tenantId, role, departmentId } = session.user;
  if (!tenantId || !id) {
    return { ok: false, response: jsonError(ERROR_MESSAGES.INVALID_SESSION, 401) };
  }

  return { ok: true, user: { id, email, tenantId, role, departmentId } };
}

export async function requireRole(
  ...roles: string[]
): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  if (!roles.includes(result.user.role)) {
    return { ok: false, response: jsonError(ERROR_MESSAGES.FORBIDDEN, 403) };
  }

  return result;
}
