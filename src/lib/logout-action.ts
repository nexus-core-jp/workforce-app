"use server";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

export async function logoutWithAudit() {
  const session = await auth();
  if (session?.user) {
    const user = toSessionUser(session.user as Record<string, unknown>);
    if (user) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "LOGOUT",
          entityType: "User",
          entityId: user.id,
        },
      }).catch(() => {});
    }
  }
  await signOut({ redirectTo: "/login" });
}
