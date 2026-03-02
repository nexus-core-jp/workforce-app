export default function AdminLoading() {
  return (
    <main className="page-container" style={{ paddingTop: 80 }}>
      <div style={{ display: "grid", gap: 16, opacity: 0.5 }}>
        <div style={{ height: 24, width: 160, background: "var(--color-border)", borderRadius: 4 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ height: 48, background: "var(--color-border)", borderRadius: 4 }} />
          ))}
        </div>
        <div style={{ height: 120, background: "var(--color-border)", borderRadius: 8 }} />
        <div style={{ height: 200, background: "var(--color-border)", borderRadius: 8 }} />
      </div>
    </main>
  );
}
