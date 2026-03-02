// CSV generation helpers (BOM-prefixed UTF-8 for Excel compatibility)

const BOM = "\uFEFF";

/** Escape a single CSV value: wrap in double-quotes if it contains comma, newline, or double-quote.
 *  Also prevent CSV formula injection (=, +, -, @, \t, \r at start of cell). */
export function escapeCsvValue(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Prevent CSV injection: cells starting with formula characters get a leading apostrophe
  const needsFormulaEscape = /^[=+\-@\t\r]/.test(s);
  if (needsFormulaEscape || s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    const escaped = s.replace(/"/g, '""');
    return `"${needsFormulaEscape ? "'" : ""}${escaped}"`;
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
