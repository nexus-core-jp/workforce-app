"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [tenant, setTenant] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Workforce</h1>
        <p className={styles.subtitle}>\u52e4\u6020\u7ba1\u7406\u30b7\u30b9\u30c6\u30e0\u306b\u30ed\u30b0\u30a4\u30f3</p>

        <form
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              await signIn("credentials", {
                tenant,
                email,
                password,
                redirect: true,
                callbackUrl: "/",
              });
            } catch {
              setError("\u30ed\u30b0\u30a4\u30f3\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u4f1a\u793eID\u30fb\u30e1\u30fc\u30eb\u30fb\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className={styles.field}>
            <label htmlFor="tenant" className={styles.fieldLabel}>\u4f1a\u793eID</label>
            <input
              id="tenant"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              required
              autoComplete="organization"
              placeholder="\u4f8b: demo"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.fieldLabel}>\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9</label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.fieldLabel}>\u30d1\u30b9\u30ef\u30fc\u30c9</label>
            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className={`btn-primary ${styles.submitBtn}`}>
            {loading && <span className={styles.spinner} />}
            {loading ? "\u30ed\u30b0\u30a4\u30f3\u4e2d\u2026" : "\u30ed\u30b0\u30a4\u30f3"}
          </button>
        </form>
      </div>
    </main>
  );
}
