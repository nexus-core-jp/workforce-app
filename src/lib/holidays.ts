// Japanese public holiday (祝日) calculator
// Covers: 固定祝日, ハッピーマンデー, 春分/秋分, 振替休日, 国民の休日

/**
 * Return all Japanese public holidays for a given year as
 * "YYYY-MM-DD" strings (JST calendar dates).
 */
export function getJapaneseHolidays(year: number): Set<string> {
  const holidays = new Map<string, string>(); // date -> name

  // --- 固定祝日 (Fixed-date holidays) ---
  const fixed: Array<[number, number, string]> = [
    [1, 1, "元日"],
    [2, 11, "建国記念の日"],
    [2, 23, "天皇誕生日"],       // 2020-
    [4, 29, "昭和の日"],
    [5, 3, "憲法記念日"],
    [5, 4, "みどりの日"],
    [5, 5, "こどもの日"],
    [8, 11, "山の日"],
    [11, 3, "文化の日"],
    [11, 23, "勤労感謝の日"],
  ];

  for (const [m, d, name] of fixed) {
    holidays.set(fmt(year, m, d), name);
  }

  // --- ハッピーマンデー (Happy Monday: nth Monday of month) ---
  holidays.set(nthWeekday(year, 1, 1, 2), "成人の日");     // 2nd Mon Jan
  holidays.set(nthWeekday(year, 7, 1, 3), "海の日");       // 3rd Mon Jul
  holidays.set(nthWeekday(year, 9, 1, 3), "敬老の日");     // 3rd Mon Sep
  holidays.set(nthWeekday(year, 10, 1, 2), "スポーツの日"); // 2nd Mon Oct

  // --- 春分の日 / 秋分の日 (Vernal / Autumnal Equinox) ---
  holidays.set(fmt(year, 3, vernalEquinoxDay(year)), "春分の日");
  holidays.set(fmt(year, 9, autumnalEquinoxDay(year)), "秋分の日");

  // --- 振替休日 (Substitute holiday) ---
  // When a holiday falls on Sunday, the next non-holiday weekday becomes a substitute
  const dates = [...holidays.keys()].sort();
  for (const dateStr of dates) {
    const d = parseDate(dateStr);
    if (d.getUTCDay() === 0) { // Sunday
      let sub = new Date(d.getTime() + 86400000); // next day
      while (holidays.has(fmtDate(sub)) || sub.getUTCDay() === 0) {
        sub = new Date(sub.getTime() + 86400000);
      }
      holidays.set(fmtDate(sub), "振替休日");
    }
  }

  // --- 国民の休日 (Sandwiched day between two holidays) ---
  const allDates = [...holidays.keys()].sort();
  for (let i = 0; i < allDates.length - 1; i++) {
    const a = parseDate(allDates[i]);
    const b = parseDate(allDates[i + 1]);
    const diff = (b.getTime() - a.getTime()) / 86400000;
    if (diff === 2) {
      const mid = new Date(a.getTime() + 86400000);
      const midStr = fmtDate(mid);
      if (!holidays.has(midStr) && mid.getUTCDay() !== 0) {
        holidays.set(midStr, "国民の休日");
      }
    }
  }

  return new Set(holidays.keys());
}

/**
 * Check if a JST date string "YYYY-MM-DD" is a Japanese public holiday.
 */
export function isJapaneseHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4), 10);
  return getJapaneseHolidays(year).has(dateStr);
}

// --- Internal helpers ---

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmtDate(d: Date): string {
  return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Find the nth occurrence of a weekday in a given month.
 * weekday: 0=Sun, 1=Mon, ..., 6=Sat
 */
function nthWeekday(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstDow = first.getUTCDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + (nth - 1) * 7;
  return fmt(year, month, day);
}

/**
 * Approximate vernal equinox day for Japan (March).
 * Formula from National Astronomical Observatory of Japan.
 */
function vernalEquinoxDay(year: number): number {
  if (year <= 1979) return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  if (year <= 2099) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return Math.floor(21.851 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/**
 * Approximate autumnal equinox day for Japan (September).
 */
function autumnalEquinoxDay(year: number): number {
  if (year <= 1979) return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  if (year <= 2099) return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return Math.floor(24.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}
