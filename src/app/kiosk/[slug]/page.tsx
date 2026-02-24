import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { KioskTerminal } from "./KioskTerminal";

type Props = { params: Promise<{ slug: string }> };

export default async function KioskPage({ params }: Props) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, faceAuthEnabled: true, plan: true },
  });

  if (!tenant) redirect("/login");
  if (!tenant.faceAuthEnabled) redirect("/login");
  if (tenant.plan === "SUSPENDED") redirect("/login");

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "var(--color-bg)",
    }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{tenant.name}</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        顔認証 出退勤端末
      </p>
      <KioskTerminal tenantSlug={slug} />
    </div>
  );
}
