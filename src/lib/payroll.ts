// Payroll calculation logic
// - Overtime: daily >8h (480min) or monthly total exceeding scheduled hours
// - Late-night: work between 22:00-05:00 JST
// - Holiday: Saturday/Sunday + Japanese public holidays (祝日)

import { getJapaneseHolidays } from "./holidays";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

interface TimeEntryForPayroll {
  date: Date;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
  workMinutes: number;
}

interface PayrollConfigInput {
  payType: "MONTHLY" | "HOURLY" | "DAILY";
  baseSalary: number;
  hourlyRate: number;
  commuteAllowance: number;
  housingAllowance: number;
  familyAllowance: number;
  otherAllowance: number;
  scheduledWorkDays: number;
  scheduledWorkMinutes: number;   // per day
  overtimeRate: number;           // e.g. 1.25
  lateNightRate: number;          // e.g. 1.50
  holidayRate: number;            // e.g. 1.35
}

export interface DailyBreakdown {
  date: string;          // YYYY-MM-DD
  dayOfWeek: number;     // 0=Sun, 6=Sat
  isHoliday: boolean;
  workMinutes: number;
  scheduledMinutes: number;
  overtimeMinutes: number;
  lateNightMinutes: number;
  holidayMinutes: number;
}

export interface MonthlyPayrollResult {
  workDays: number;
  absentDays: number;
  totalWorkMinutes: number;
  scheduledMinutes: number;
  overtimeMinutes: number;
  lateNightMinutes: number;
  holidayMinutes: number;
  basePay: number;
  overtimePay: number;
  lateNightPay: number;
  holidayPay: number;
  commuteAllowance: number;
  otherAllowances: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  dailyBreakdown: DailyBreakdown[];
  overtime36Alert: Overtime36Alert | null;
}

export interface Overtime36Alert {
  monthlyOvertimeHours: number;
  isOver45h: boolean;
  isOver80h: boolean;
  message: string;
}

/** Get JST hour (0-23) from a UTC Date */
function getJstHour(date: Date): number {
  const jstMs = date.getTime() + JST_OFFSET_MS;
  return new Date(jstMs).getUTCHours();
}

/** Get JST day-of-week (0=Sun) from a date-only field */
function getJstDayOfWeek(dateOnly: Date): number {
  const jstMs = dateOnly.getTime() + JST_OFFSET_MS;
  return new Date(jstMs).getUTCDay();
}

/** Check if date falls on weekend (Sat=6 or Sun=0) */
function isWeekend(dateOnly: Date): boolean {
  const dow = getJstDayOfWeek(dateOnly);
  return dow === 0 || dow === 6;
}

/** Format a UTC-stored JST date to "YYYY-MM-DD" for holiday lookup */
function toJstDateStr(dateOnly: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateOnly);
}

/** Check if date is a non-working day (weekend or Japanese public holiday) */
function isNonWorkingDay(dateOnly: Date, holidays: Set<string>): boolean {
  if (isWeekend(dateOnly)) return true;
  return holidays.has(toJstDateStr(dateOnly));
}

/**
 * Calculate overlap in minutes between a work period and a single
 * late-night window [windowStart, windowEnd).
 */
function overlapMinutes(workStart: number, workEnd: number, windowStart: number, windowEnd: number): number {
  const start = Math.max(workStart, windowStart);
  const end = Math.min(workEnd, windowEnd);
  return Math.max(0, end - start);
}

/**
 * Calculate late-night minutes (22:00-05:00 JST) from clockIn/clockOut.
 * Uses O(1) range overlap math instead of per-minute iteration.
 */
function calcLateNightMinutes(clockIn: Date, clockOut: Date): number {
  const inMs = clockIn.getTime();
  const outMs = clockOut.getTime();
  if (outMs <= inMs) return 0;

  // Convert to JST minutes since epoch
  const inJstMin = Math.floor((inMs + JST_OFFSET_MS) / 60000);
  const outJstMin = Math.floor((outMs + JST_OFFSET_MS) / 60000);

  // Find the JST calendar day of clock-in
  const MINUTES_PER_DAY = 1440;
  const startDay = Math.floor(inJstMin / MINUTES_PER_DAY);
  const endDay = Math.floor((outJstMin - 1) / MINUTES_PER_DAY);

  let total = 0;

  // Check late-night windows for each day the shift spans.
  // Late-night is 22:00-05:00 JST, which spans two calendar days:
  //   - Evening window: day D 22:00 (D*1440+1320) to day D+1 00:00 (D*1440+1440)
  //   - Morning window: day D 00:00 (D*1440+0) to day D 05:00 (D*1440+300)
  for (let d = startDay; d <= endDay + 1; d++) {
    const dayBase = d * MINUTES_PER_DAY;
    // Morning: 00:00-05:00 JST
    total += overlapMinutes(inJstMin, outJstMin, dayBase, dayBase + 300);
    // Evening: 22:00-24:00 JST
    total += overlapMinutes(inJstMin, outJstMin, dayBase + 1320, dayBase + MINUTES_PER_DAY);
  }

  return total;
}

/**
 * Calculate monthly payroll for a single employee.
 */
export function calculateMonthlyPayroll(
  entries: TimeEntryForPayroll[],
  config: PayrollConfigInput,
  month: string,  // "YYYY-MM"
  customHolidays?: string[],  // "YYYY-MM-DD" strings for company-specific holidays
): MonthlyPayrollResult {
  const dailyBreakdown: DailyBreakdown[] = [];
  const [year] = month.split("-").map(Number);

  // Build holiday set: national holidays + company custom holidays
  const holidays = getJapaneseHolidays(year);
  const holidaysAdj = getJapaneseHolidays(year + 1);
  const mergedHolidays = new Set([...holidays, ...holidaysAdj]);
  if (customHolidays) {
    for (const d of customHolidays) mergedHolidays.add(d);
  }

  let totalWorkMinutes = 0;
  let totalScheduledMinutes = 0;
  let totalOvertimeMinutes = 0;
  let totalLateNightMinutes = 0;
  let totalHolidayMinutes = 0;
  let workDays = 0;

  for (const entry of entries) {
    if (!entry.clockInAt || entry.workMinutes === 0) continue;

    const holiday = isNonWorkingDay(entry.date, mergedHolidays);
    const dayWork = entry.workMinutes;

    workDays++;
    totalWorkMinutes += dayWork;

    // Late-night calculation (requires actual clock times)
    let lateNight = 0;
    if (entry.clockInAt && entry.clockOutAt) {
      lateNight = calcLateNightMinutes(entry.clockInAt, entry.clockOutAt);
      // Subtract break time from late-night if break overlaps
      if (entry.breakStartAt && entry.breakEndAt) {
        const breakLateNight = calcLateNightMinutes(entry.breakStartAt, entry.breakEndAt);
        lateNight = Math.max(0, lateNight - breakLateNight);
      }
    }

    let overtime = 0;
    let scheduled = dayWork;

    if (holiday) {
      // All work on holidays counts as holiday work
      totalHolidayMinutes += dayWork;
      scheduled = 0;
    } else {
      // Overtime = work beyond scheduled daily hours (e.g. 8h = 480min)
      if (dayWork > config.scheduledWorkMinutes) {
        overtime = dayWork - config.scheduledWorkMinutes;
        scheduled = config.scheduledWorkMinutes;
      }
      totalOvertimeMinutes += overtime;
    }

    totalScheduledMinutes += scheduled;
    totalLateNightMinutes += lateNight;

    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(entry.date);

    dailyBreakdown.push({
      date: dateStr,
      dayOfWeek: getJstDayOfWeek(entry.date),
      isHoliday: holiday,
      workMinutes: dayWork,
      scheduledMinutes: scheduled,
      overtimeMinutes: overtime,
      lateNightMinutes: lateNight,
      holidayMinutes: holiday ? dayWork : 0,
    });
  }

  // Calculate absent days (scheduled work days minus actual work days on working days)
  const [, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  let scheduledWorkDaysInMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, mon - 1, d) - JST_OFFSET_MS);
    if (!isNonWorkingDay(dt, mergedHolidays)) {
      scheduledWorkDaysInMonth++;
    }
  }
  const weekdayWorkDays = dailyBreakdown.filter(d => !d.isHoliday).length;
  const absentDays = Math.max(0, scheduledWorkDaysInMonth - weekdayWorkDays);

  // --- Pay calculation ---
  const baseHourlyRate = calcBaseHourlyRate(config);

  // Base pay
  let basePay: number;
  if (config.payType === "MONTHLY") {
    // Monthly salary - deduct absent days proportionally
    const fullBase = config.baseSalary;
    if (absentDays > 0 && scheduledWorkDaysInMonth > 0) {
      const dailyRate = fullBase / scheduledWorkDaysInMonth;
      basePay = Math.round(fullBase - dailyRate * absentDays);
    } else {
      basePay = fullBase;
    }
  } else if (config.payType === "DAILY") {
    basePay = config.baseSalary * workDays;
  } else {
    // HOURLY
    basePay = Math.round(config.hourlyRate * (totalScheduledMinutes / 60));
  }

  // Overtime pay (時間外手当)
  const overtimePay = Math.round(baseHourlyRate * config.overtimeRate * (totalOvertimeMinutes / 60));

  // Late-night pay (深夜手当) - additional premium only (0.25 or 0.50 - 1.0 portion)
  // Late-night premium is the difference above normal rate
  const lateNightPremiumRate = config.lateNightRate - 1.0;
  const lateNightPay = Math.round(baseHourlyRate * lateNightPremiumRate * (totalLateNightMinutes / 60));

  // Holiday pay (休日手当)
  const holidayPay = Math.round(baseHourlyRate * config.holidayRate * (totalHolidayMinutes / 60));

  // Allowances
  const commuteAllowance = config.commuteAllowance;
  const otherAllowances = config.housingAllowance + config.familyAllowance + config.otherAllowance;

  const grossPay = basePay + overtimePay + lateNightPay + holidayPay + commuteAllowance + otherAllowances;
  const deductions = 0; // Phase 2: social insurance, tax
  const netPay = grossPay - deductions;

  // 36 Agreement alert
  const overtimeHours = totalOvertimeMinutes / 60;
  let overtime36Alert: Overtime36Alert | null = null;
  if (overtimeHours > 45) {
    overtime36Alert = {
      monthlyOvertimeHours: Math.round(overtimeHours * 10) / 10,
      isOver45h: true,
      isOver80h: overtimeHours > 80,
      message: overtimeHours > 80
        ? `月間残業 ${Math.round(overtimeHours)}時間: 過労死ラインを超えています`
        : `月間残業 ${Math.round(overtimeHours)}時間: 36協定の上限(45h)を超えています`,
    };
  } else if (overtimeHours > 30) {
    overtime36Alert = {
      monthlyOvertimeHours: Math.round(overtimeHours * 10) / 10,
      isOver45h: false,
      isOver80h: false,
      message: `月間残業 ${Math.round(overtimeHours)}時間: 36協定上限(45h)に注意`,
    };
  }

  return {
    workDays,
    absentDays,
    totalWorkMinutes,
    scheduledMinutes: totalScheduledMinutes,
    overtimeMinutes: totalOvertimeMinutes,
    lateNightMinutes: totalLateNightMinutes,
    holidayMinutes: totalHolidayMinutes,
    basePay,
    overtimePay,
    lateNightPay,
    holidayPay,
    commuteAllowance,
    otherAllowances,
    grossPay,
    deductions,
    netPay,
    dailyBreakdown,
    overtime36Alert,
  };
}

/** Calculate base hourly rate from config */
function calcBaseHourlyRate(config: PayrollConfigInput): number {
  if (config.payType === "HOURLY") return config.hourlyRate;
  if (config.payType === "DAILY") {
    return config.baseSalary / (config.scheduledWorkMinutes / 60);
  }
  // MONTHLY: monthly salary / (scheduled days * scheduled hours)
  const monthlyHours = config.scheduledWorkDays * (config.scheduledWorkMinutes / 60);
  return monthlyHours > 0 ? config.baseSalary / monthlyHours : 0;
}

/**
 * Generate Zengin (全銀) format CSV for bank transfers.
 * Simplified version: standard CSV with required fields for IB upload.
 */
export function generateZenginCsv(
  payrolls: Array<{
    bankCode: string;
    branchCode: string;
    accountType: string;
    accountNumber: string;
    accountHolder: string;
    amount: number;
  }>,
): string {
  const BOM = "\uFEFF";
  const headers = ["銀行コード", "支店コード", "預金種目", "口座番号", "受取人名", "振込金額"];
  const lines: string[] = [headers.join(",")];

  for (const p of payrolls) {
    const accountTypeCode = p.accountType === "当座" ? "2" : "1"; // 1=普通, 2=当座
    lines.push([
      p.bankCode.padStart(4, "0"),
      p.branchCode.padStart(3, "0"),
      accountTypeCode,
      p.accountNumber.padStart(7, "0"),
      p.accountHolder,
      String(p.amount),
    ].join(","));
  }

  return BOM + lines.join("\r\n") + "\r\n";
}
