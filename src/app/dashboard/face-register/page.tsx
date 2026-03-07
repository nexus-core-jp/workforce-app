import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { FaceRegister } from "./FaceRegister";

export default async function FaceRegisterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { faceAuthEnabled: true },
  });
  if (!tenant?.faceAuthEnabled) redirect("/dashboard");

  const roleLabel = user.role === "ADMIN" ? "管理者" : "従業員";

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className={`badge ${user.role === "ADMIN" ? "badge-closed" : "badge-open"}`}>
            {roleLabel}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-compact">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ marginBottom: 8 }}>
          <Link href="/dashboard">← マイページ</Link>
        </nav>
        <h2 style={{ marginBottom: 12 }}>顔データ登録</h2>
        <FaceRegister />
      </main>
    </>
  );
}
