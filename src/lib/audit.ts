import { prisma } from "./db";

interface AuditEntry {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: entry.beforeJson ? JSON.parse(JSON.stringify(entry.beforeJson)) : undefined,
        afterJson: entry.afterJson ? JSON.parse(JSON.stringify(entry.afterJson)) : undefined,
      },
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}
