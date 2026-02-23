// Typed session helpers for NextAuth JWT callbacks.
// Keeps auth.ts and API routes free from `as any`.

import type { UserRole } from "@/generated/prisma";

/** Fields we embed into the JWT / session.user */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  tenantId: string;
  role: UserRole;
  departmentId?: string | null;
}

/** Extract our custom fields from the NextAuth session user (which is loosely typed). */
export function toSessionUser(raw: Record<string, unknown>): SessionUser | null {
  const id = raw.id ?? raw.sub;
  const tenantId = raw.tenantId;
  const role = raw.role;
  const email = raw.email;
  if (typeof id !== "string" || typeof tenantId !== "string" || typeof role !== "string" || typeof email !== "string") {
    return null;
  }
  return {
    id,
    email,
    name: typeof raw.name === "string" ? raw.name : null,
    tenantId,
    role: role as UserRole,
    departmentId: typeof raw.departmentId === "string" ? raw.departmentId : null,
  };
}
