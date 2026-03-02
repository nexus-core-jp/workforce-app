import { prisma } from "@/lib/db";

export async function writeAuditLog(params: {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeJson: params.before !== undefined ? (params.before as object) : undefined,
      afterJson: params.after !== undefined ? (params.after as object) : undefined,
    },
  });
}
