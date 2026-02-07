import { prisma } from "@/lib/db";
import { toCloseMonth } from "@/lib/jst";

export async function isMonthClosed(tenantId: string, date: Date): Promise<boolean> {
  const month = toCloseMonth(date);
  const close = await prisma.close.findUnique({
    where: { tenantId_month_scope_departmentId: { tenantId, month, scope: "COMPANY", departmentId: "" } },
  });
  return !!close;
}
