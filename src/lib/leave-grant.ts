/**
 * 年次有給休暇の自動付与 + 5日取得義務のコンプライアンスチェック
 *
 * 労働基準法 第39条:
 *   - 雇入れから6ヶ月継続勤務 + 全労働日の8割以上出勤で年次有給を付与
 *   - 勤続年数に応じた付与日数テーブル(下記 GRANT_TABLE 参照)
 *   - 年10日以上付与される労働者には、付与日から1年以内に
 *     5日以上を取得させる義務(第39条第7項)
 */

import { startOfJstDay } from "./time";

/**
 * 勤続年数別 年次有給付与日数(フルタイム週所定労働日数5日以上)
 * 入社日から「継続勤務期間」が経過した時点で付与される日数。
 */
const GRANT_TABLE_FULL_TIME: Array<{ afterMonths: number; days: number }> = [
  { afterMonths: 6, days: 10 },      // 6ヶ月
  { afterMonths: 18, days: 11 },     // 1年6ヶ月
  { afterMonths: 30, days: 12 },     // 2年6ヶ月
  { afterMonths: 42, days: 14 },     // 3年6ヶ月
  { afterMonths: 54, days: 16 },     // 4年6ヶ月
  { afterMonths: 66, days: 18 },     // 5年6ヶ月
  { afterMonths: 78, days: 20 },     // 6年6ヶ月以降
];

export interface GrantPlan {
  userId: string;
  effectiveDate: Date; // JST midnight
  days: number;
  reason: string;      // e.g. "入社6ヶ月経過"
}

/** Extract JST calendar components from a Date. */
function jstYmd(d: Date): { y: number; m: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = fmt.split("-").map(Number);
  return { y, m, day };
}

/** Build a JST-midnight Date from JST calendar components. */
function jstDate(y: number, m: number, day: number): Date {
  return startOfJstDay(new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0)));
}

/**
 * 入社日から基準日までの経過月数を返す(整数)。JST基準。
 */
function monthsBetween(hireDate: Date, as: Date): number {
  const h = jstYmd(hireDate);
  const a = jstYmd(as);
  let months = (a.y - h.y) * 12 + (a.m - h.m);
  if (a.day < h.day) months -= 1;
  return months;
}

/** 入社日 + Nヶ月 の JST 付与日を返す */
function addMonthsJst(hireDate: Date, months: number): Date {
  const h = jstYmd(hireDate);
  const absMonth = h.y * 12 + (h.m - 1) + months;
  const newY = Math.floor(absMonth / 12);
  const newM = (absMonth % 12) + 1;
  return jstDate(newY, newM, h.day);
}

/**
 * 入社日から経過した月数に対応する「直近の付与タイミング」と
 * その時に付与すべき日数を計算する。
 *
 * 戻り値 null = 付与タイミングにまだ達していない
 */
export function nextGrantDate(
  hireDate: Date,
): Array<{ effectiveDate: Date; afterMonths: number; days: number }> {
  return GRANT_TABLE_FULL_TIME.map((row) => ({
    effectiveDate: addMonthsJst(hireDate, row.afterMonths),
    afterMonths: row.afterMonths,
    days: row.days,
  }));
}

/**
 * 対象ユーザー群と既存の GRANT ledger entries から、
 * 今日時点で付与されるべきだがまだ付与されていない分を算出する。
 *
 * 冪等性: 同じ `effectiveDate` + `days` の GRANT が既に存在すれば付与しない。
 */
export function computeDuePlans(
  users: Array<{ id: string; hireDate: Date | null; retiredAt: Date | null }>,
  existingGrants: Array<{ userId: string; effectiveDate: Date; days: number }>,
  today: Date = new Date(),
): GrantPlan[] {
  const plans: GrantPlan[] = [];
  const todayJst = startOfJstDay(today);

  // Index existing grants: userId → Set of "effectiveDate:days"
  const existing = new Set<string>();
  for (const g of existingGrants) {
    const key = `${g.userId}:${toYmd(g.effectiveDate)}:${g.days}`;
    existing.add(key);
  }

  for (const u of users) {
    if (!u.hireDate) continue;
    if (u.retiredAt) continue;

    const monthsElapsed = monthsBetween(u.hireDate, todayJst);
    for (const row of GRANT_TABLE_FULL_TIME) {
      if (monthsElapsed < row.afterMonths) break;

      const effectiveJst = addMonthsJst(u.hireDate, row.afterMonths);

      // Skip if already granted at this milestone (same effectiveDate+days)
      const key = `${u.id}:${toYmd(effectiveJst)}:${row.days}`;
      if (existing.has(key)) continue;

      plans.push({
        userId: u.id,
        effectiveDate: effectiveJst,
        days: row.days,
        reason: `勤続${row.afterMonths}ヶ月 年次有給自動付与`,
      });
    }
  }

  return plans;
}

function toYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// ----------------------------------------------------------------------------
// 5日取得義務のコンプライアンスチェック
// ----------------------------------------------------------------------------

export interface ComplianceStatus {
  userId: string;
  /** 付与日(直近) */
  grantDate: Date | null;
  /** 付与日から1年間で使用した日数 */
  usedInPeriod: number;
  /** 付与日から1年後の期限 */
  deadline: Date | null;
  /** 期限までの残日数(今日から) */
  daysUntilDeadline: number | null;
  /** あと何日取得が必要か(max 0) */
  daysShort: number;
  /** 年10日以上の付与があったか(5日取得義務の対象か) */
  subjectTo5DayRule: boolean;
  /** 警告レベル */
  level: "ok" | "warning" | "violation";
}

/**
 * 対象ユーザー1名の5日取得義務ステータスを計算する。
 *
 * ルール:
 *   - 年10日以上の付与を受けた者が対象
 *   - 直近の付与日から1年以内に5日取得が必要
 *   - 期限3ヶ月前を切って不足があれば warning
 *   - 期限超過で5日未満なら violation
 */
export function computeComplianceStatus(
  userId: string,
  grants: Array<{ days: number; effectiveDate: Date }>,
  uses: Array<{ days: number; effectiveDate: Date }>,
  today: Date = new Date(),
): ComplianceStatus {
  const todayJst = startOfJstDay(today);

  // 直近の「10日以上の付与」を探す
  const qualifying = grants
    .filter((g) => g.days >= 10)
    .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());

  if (qualifying.length === 0) {
    return {
      userId,
      grantDate: null,
      usedInPeriod: 0,
      deadline: null,
      daysUntilDeadline: null,
      daysShort: 0,
      subjectTo5DayRule: false,
      level: "ok",
    };
  }

  const latestGrant = qualifying[0];
  const grantDate = latestGrant.effectiveDate;
  const deadline = new Date(grantDate);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + 1);

  // 付与日から期限までの使用日数を集計
  let usedInPeriod = 0;
  for (const u of uses) {
    if (u.effectiveDate.getTime() < grantDate.getTime()) continue;
    if (u.effectiveDate.getTime() >= deadline.getTime()) continue;
    usedInPeriod += u.days;
  }

  const daysShort = Math.max(0, 5 - usedInPeriod);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilDeadline = Math.floor(
    (deadline.getTime() - todayJst.getTime()) / msPerDay,
  );

  let level: ComplianceStatus["level"] = "ok";
  if (daysShort > 0) {
    if (daysUntilDeadline < 0) {
      level = "violation"; // 期限超過&未達
    } else if (daysUntilDeadline <= 90) {
      level = "warning"; // 期限3ヶ月前以内で未達
    }
  }

  return {
    userId,
    grantDate,
    usedInPeriod,
    deadline,
    daysUntilDeadline,
    daysShort,
    subjectTo5DayRule: true,
    level,
  };
}
