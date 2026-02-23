import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 32,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 12 }}><span className="logo"><span className="logo-icon" style={{ width: 32, height: 32, fontSize: 13 }}>WN</span><span className="logo-text">Workforce Nexus</span></span></h1>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>アカウント停止中</h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 24 }}>
          お客様のアカウントは現在停止されています。
          <br />
          サービスをご利用いただくには、管理者にお問い合わせください。
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" data-variant="primary">
            ログアウト
          </button>
        </form>
      </div>
    </main>
  );
}
