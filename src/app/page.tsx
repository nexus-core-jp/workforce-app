import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { toSessionUser } from "@/lib/session";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role === "SUPER_ADMIN") redirect("/super-admin");
  redirect("/dashboard");
}
