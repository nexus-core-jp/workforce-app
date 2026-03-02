import { prisma } from "@/lib/db";

interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    },
  });
}

/** Notify all ADMIN users in a tenant */
export async function notifyAdmins(
  tenantId: string,
  type: string,
  title: string,
  message: string,
  link?: string,
) {
  const admins = await prisma.user.findMany({
    where: {
      tenantId,
      active: true,
      role: "ADMIN",
    },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      tenantId,
      userId: a.id,
      type,
      title,
      message,
      link,
    })),
  });
}
