import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutWithAudit } from "@/lib/logout-action";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

export default async function SuspendedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  // If not suspended, redirect to dashboard
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { plan: true },
  });

  if (tenant?.plan !== "SUSPENDED") {
    redirect("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "2.5rem 2rem",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl, 16px)",
          boxShadow: "var(--shadow-lg)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>
          <span className="logo">
            <span className="logo-icon" style={{ width: 32, height: 32, fontSize: 13 }}>WN</span>
            <span className="logo-text">Workforce Nexus</span>
          </span>
        </h1>

        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--color-error-bg)",
            color: "var(--color-danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 16px",
          }}
          aria-hidden="true"
        >
          ⚠
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>アカウント停止中</h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
          お客様のアカウントは現在停止されています。
          <br />
          お支払い状況をご確認の上、管理者にお問い合わせください。
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
          お問い合わせ: <a href="mailto:support@workforce-nexus.jp" style={{ color: "var(--color-primary)" }}>support@workforce-nexus.jp</a>
        </p>
        <form
          action={async () => {
            "use server";
            await logoutWithAudit();
          }}
        >
          <button type="submit" data-variant="primary" style={{ width: "100%" }}>
            ログアウト
          </button>
        </form>
      </div>
    </main>
  );
}
