// CSV generation helpers (BOM-prefixed UTF-8 for Excel compatibility)

const BOM = "\uFEFF";

/** Escape a single CSV value: wrap in double-quotes if it contains comma, newline, or double-quote. */
export function escapeCsvValue(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convert headers + row arrays into a BOM-prefixed CSV string. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}
