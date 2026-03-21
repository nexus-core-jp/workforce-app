"use client";

import { useState } from "react";
import { NavLink } from "@/components/NavLink";

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
      <nav className="admin-nav-desktop" style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {visibleLinks.map((l) => (
          <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <div className="admin-nav-mobile">
        <button
          className="btn-compact"
          onClick={() => setOpen(!open)}
          aria-label="メニュー"
          aria-expanded={open}
          style={{ marginBottom: 8 }}
        >
          {open ? "✕ 閉じる" : "☰ メニュー"}
        </button>

        {open && (
          <nav
            role="navigation"
            aria-label="管理メニュー"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "12px 0",
              borderBottom: "1px solid var(--color-border)",
              marginBottom: 12,
            }}
          >
            {visibleLinks.map((l) => (
              <NavLink key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
