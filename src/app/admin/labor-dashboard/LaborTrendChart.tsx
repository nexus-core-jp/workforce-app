"use client";

/**
 * 軽量な自前SVG棒グラフ。Recharts等を導入するより依存を減らせる。
 */

interface Row {
  label: string;
  work: number;
  overtime: number;
  lateNight: number;
  holiday: number;
}

export function LaborTrendChart({ data }: { data: Row[] }) {
  const maxWork = Math.max(1, ...data.map((d) => d.work));
  const barWidth = 40;
  const gap = 16;
  const chartHeight = 180;
  const chartWidth = data.length * (barWidth + gap) + gap;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width={chartWidth}
        height={chartHeight + 48}
        style={{ display: "block", fontFamily: "system-ui" }}
      >
        {data.map((d, i) => {
          const x = gap + i * (barWidth + gap);
          const workH = (d.work / maxWork) * chartHeight;
          const overtimeH = (d.overtime / maxWork) * chartHeight;
          return (
            <g key={i}>
              {/* 総労働時間(背景バー) */}
              <rect
                x={x}
                y={chartHeight - workH}
                width={barWidth}
                height={workH}
                fill="var(--color-primary, #2563eb)"
                opacity={0.25}
              />
              {/* 残業時間(濃い赤) */}
              <rect
                x={x}
                y={chartHeight - overtimeH}
                width={barWidth}
                height={overtimeH}
                fill="var(--color-danger, #dc2626)"
              />
              {/* 値ラベル */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - workH - 4}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
              >
                {d.work}h
              </text>
              {/* 月ラベル */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
              >
                {d.label.slice(5)}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 32}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-danger, #dc2626)"
              >
                残業{d.overtime}h
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
        青: 総労働時間 / 赤: 時間外労働時間
      </div>
    </div>
  );
}
