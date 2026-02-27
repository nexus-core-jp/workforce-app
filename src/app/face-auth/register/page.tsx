import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MAX_DESCRIPTORS_PER_USER } from "@/lib/face-match";
import { toSessionUser } from "@/lib/session";
import { Logo } from "@/app/Logo";

import { FaceRegisterClient } from "./FaceRegisterClient";

export default async function FaceRegisterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, id: userId } = user;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { faceAuthEnabled: true },
  });

  if (!tenant?.faceAuthEnabled) {
    redirect("/dashboard");
  }

  const descriptors = await prisma.faceDescriptor.findMany({
    where: { tenantId, userId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
      </header>
      <main className="page-container">
        <nav style={{ marginBottom: 8 }}>
          <Link href="/dashboard">← ダッシュボード</Link>
        </nav>

        <h1 style={{ marginBottom: 16 }}>顔認証 登録</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
          出勤・退勤時に顔認証が必要です。カメラで顔を撮影して登録してください。
        </p>

        <FaceRegisterClient
          initialCount={descriptors.length}
          initialDescriptors={descriptors.map((d) => ({
            id: d.id,
            createdAt: d.createdAt.toISOString(),
          }))}
          maxDescriptors={MAX_DESCRIPTORS_PER_USER}
        />
      </main>
    </>
  );
}
