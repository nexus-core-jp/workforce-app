export function Logo({ sub }: { sub?: string }) {
  return (
    <span className="logo">
      <span className="logo-icon">W</span>
      <span className="logo-text">Workforce</span>
      {sub && <span className="logo-sub">— {sub}</span>}
    </span>
  );
}
