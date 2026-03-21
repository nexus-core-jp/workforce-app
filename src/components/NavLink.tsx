"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="パンくずリスト" className="breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`nav-link ${isActive ? "nav-link-active" : ""}`}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
