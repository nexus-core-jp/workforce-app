export function Logo({ sub }: { sub?: string }) {
  return (
    <span className="logo">
      <span className="logo-icon">WN</span>
      <span className="logo-text">Workforce Nexus</span>
      {sub && <span className="logo-sub">— {sub}</span>}
    </span>
  );
}
