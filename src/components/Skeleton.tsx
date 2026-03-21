export function Skeleton({
  width,
  height = 16,
  radius = 6,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className ?? ""}`}
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <Skeleton width="40%" height={20} radius={4} />
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? "60%" : "100%"}
            height={14}
            radius={4}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} width="80%" height={12} radius={3} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              key={c}
              width={c === 0 ? "70%" : "50%"}
              height={14}
              radius={3}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
