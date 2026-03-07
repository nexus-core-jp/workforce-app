import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { InvoiceActions } from "./InvoiceActions";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tenant: { select: { name: true, slug: true } },
      confirmedBy: { select: { name: true, email: true } },
    },
  });

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const items = invoices.map((inv) => ({
    id: inv.id,
    tenantName: inv.tenant.name,
    tenantSlug: inv.tenant.slug,
    amount: inv.amount,
    status: inv.status,
    dueDate: formatDate(inv.dueDate),
    createdAt: formatDate(inv.createdAt),
    paidAt: inv.paidAt ? formatDate(inv.paidAt) : null,
    confirmedByName: inv.confirmedBy?.name ?? inv.confirmedBy?.email ?? null,
  }));

  return (
    <>
      <header className="app-header">
        <h1><Logo sub="Super Admin" /></h1>
        <div className="user-info">
          <span className="badge badge-closed">SA</span>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ marginBottom: 8 }}>
          <Link href="/super-admin">← テナント一覧</Link>
        </nav>

        <section>
          <h2 style={{ marginBottom: 16 }}>請求書管理（銀行振込）</h2>
          <InvoiceActions invoices={items} />
        </section>
      </main>
    </>
  );
}
