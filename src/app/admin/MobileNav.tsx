"use client";

import Link from "next/link";
import { useState } from "react";

interface MobileNavProps {
  role: string;
  links: { href: string; label: string; adminOnly?: boolean }[];
}

export function MobileNav({ role, links }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const visibleLinks = links.filter((l) => !l.adminOnly || role === "ADMIN");

  return (
    <>
      {/* Desktop nav - hidden on mobile */}
      <nav className="admin-nav-desktop" style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        {visibleLinks.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <div className="admin-nav-mobile">
        <button
          className="btn-compact"
          onClick={() => setOpen(!open)}
          aria-label="メニュー"
          style={{ marginBottom: 8 }}
        >
          {open ? "✕ 閉じる" : "☰ メニュー"}
        </button>

        {open && (
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px 0",
              borderBottom: "1px solid var(--color-border)",
              marginBottom: 12,
            }}
          >
            {visibleLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
