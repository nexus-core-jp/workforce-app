/**
 * 外部給与システム向けエクスポートフォーマット
 *
 * - freee (人事労務): 従業員データCSVインポート形式
 *   https://support.freee.co.jp/hc/ja/articles/202851020
 *   (API連携は将来フェーズ。まずは汎用CSVインポート経由)
 *
 * - マネーフォワード クラウド給与: 勤怠インポート形式
 *   https://biz.moneyforward.com/support/payroll/guide/import/attendance.html
 *
 * 実データフォーマットは各サービスで微調整が必要なので、
 * 標準的な項目のみを出力し、受け取り側で列マッピングする前提。
 */

import { toCsv } from "./csv";

export type ExternalPayrollFormat = "freee" | "moneyforward";

export interface PayrollRowInput {
  employeeCode: string;   // 従業員番号(無ければメール)
  name: string;
  totalWorkMinutes: number;
  scheduledMinutes: number;
  overtimeMinutes: number;
  lateNightMinutes: number;
  holidayMinutes: number;
  workDays: number;
  absentDays: number;
  basePay: number;
  overtimePay: number;
  lateNightPay: number;
  holidayPay: number;
  commuteAllowance: number;
  otherAllowances: number;
  grossPay: number;
}

/**
 * freee 人事労務「勤怠データ」CSV:
 *   必須: 従業員番号, 対象年月, 勤務日数, 欠勤日数, 所定内労働時間, 法定時間外, 深夜, 法定休日労働時間, 遅刻早退
 */
export function generateFreeeAttendanceCsv(
  month: string,
  rows: PayrollRowInput[],
): string {
  const headers = [
    "従業員番号",
    "氏名",
    "対象年月",
    "勤務日数",
    "欠勤日数",
    "所定内労働時間(時)",
    "法定時間外労働時間(時)",
    "深夜労働時間(時)",
    "法定休日労働時間(時)",
    "遅刻早退時間(時)",
  ];
  const body = rows.map((r) => [
    r.employeeCode,
    r.name,
    month,
    r.workDays,
    r.absentDays,
    toHours(r.scheduledMinutes),
    toHours(r.overtimeMinutes),
    toHours(r.lateNightMinutes),
    toHours(r.holidayMinutes),
    0, // 遅刻早退時間: 現状トラッキングしていないので 0
  ]);
  return toCsv(headers, body);
}

/**
 * マネーフォワード クラウド給与「勤怠データ取込」CSV
 * MFはインポートテンプレートに合わせた列名が必要なので、代表項目で出力する。
 */
export function generateMoneyForwardAttendanceCsv(
  month: string,
  rows: PayrollRowInput[],
): string {
  const headers = [
    "社員番号",
    "氏名",
    "対象月",
    "出勤日数",
    "欠勤日数",
    "総労働時間",
    "所定内労働時間",
    "時間外労働時間",
    "深夜労働時間",
    "休日労働時間",
  ];
  const body = rows.map((r) => [
    r.employeeCode,
    r.name,
    month,
    r.workDays,
    r.absentDays,
    toHours(r.totalWorkMinutes),
    toHours(r.scheduledMinutes),
    toHours(r.overtimeMinutes),
    toHours(r.lateNightMinutes),
    toHours(r.holidayMinutes),
  ]);
  return toCsv(headers, body);
}

function toHours(minutes: number): string {
  return (Math.round((minutes / 60) * 100) / 100).toFixed(2);
}
