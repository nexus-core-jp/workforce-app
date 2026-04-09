"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {
            // Ignore unregister failure in dev.
          });
        }
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed — not critical
    });
  }, []);

  return null;
}
