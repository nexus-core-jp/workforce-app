// Overtime calculation utilities
// Japan labor law: 8h/day standard, 40h/week, 45h/month (36 agreement)

/** Standard work minutes per day (8 hours) */
export const STANDARD_DAILY_MINUTES = 480;

/** Monthly overtime threshold for 36 agreement (45 hours = 2700 min) */
export const MONTHLY_OVERTIME_LIMIT_MINUTES = 2700;

/** Weekly work limit (40 hours = 2400 min) */
export const WEEKLY_WORK_LIMIT_MINUTES = 2400;

export interface OvertimeSummary {
  userId: string;
  userName: string;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  workDays: number;
  /** true when monthly overtime exceeds 45h */
  exceeds36Agreement: boolean;
  /** percentage of monthly 45h limit */
  overtimePercentage: number;
}

/**
 * Calculate daily overtime: anything over standardMinutes per day.
 * If a shift pattern exists, use its planned hours as the standard.
 */
export function calcDailyOvertime(
  workMinutes: number,
  standardMinutes: number = STANDARD_DAILY_MINUTES,
): number {
  return Math.max(0, workMinutes - standardMinutes);
}

/**
 * Calculate monthly overtime summary from an array of daily work minutes.
 */
export function calcMonthlyOvertime(
  dailyWorkMinutes: number[],
  standardMinutesPerDay: number = STANDARD_DAILY_MINUTES,
): { totalWork: number; totalOvertime: number; exceeds36: boolean } {
  let totalWork = 0;
  let totalOvertime = 0;

  for (const wm of dailyWorkMinutes) {
    totalWork += wm;
    totalOvertime += calcDailyOvertime(wm, standardMinutesPerDay);
  }

  return {
    totalWork,
    totalOvertime,
    exceeds36: totalOvertime > MONTHLY_OVERTIME_LIMIT_MINUTES,
  };
}

/** Format minutes to "Xh Ym" */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}
