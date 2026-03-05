"use server";

import { signIn } from "@/auth";

/**
 * One-click demo login via server action.
 * Uses AUTH_SECRET as an internal token so the demo password is never exposed to the client.
 */
export async function demoLogin(role: "admin" | "employee" | "approver" = "admin") {
  const emailMap = {
    admin: "admin@demo.local",
    employee: "tanaka@demo.local",
    approver: "suzuki@demo.local",
  } as const;

  await signIn("credentials", {
    tenant: "demo",
    email: emailMap[role],
    password: `__demo:${process.env.AUTH_SECRET}`,
    redirectTo: "/dashboard",
  });
}
