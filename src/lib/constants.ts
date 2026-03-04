/** Application-wide constants */

export const TIMEZONE = "Asia/Tokyo" as const;
export const LOCALE = "ja-JP" as const;
export const DATE_LOCALE = "en-CA" as const;

export const HISTORY_DAYS = 7;
export const PENDING_CORRECTIONS_LIMIT = 10;
export const REASON_MAX_LENGTH = 500;

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60_000;

/** Error messages in Japanese for user-facing errors */
export const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  UNAUTHORIZED: "ログインが必要です",
  INVALID_SESSION: "セッションが無効です。再ログインしてください",
  FORBIDDEN: "この操作を行う権限がありません",
  LOGIN_FAILED: "ログインに失敗しました。会社ID・メール・パスワードをご確認ください",

  // Punch
  MISSING_ACTION: "打刻操作が指定されていません",
  ALREADY_CLOCKED_IN: "すでに出勤済みです",
  NOT_CLOCKED_IN: "出勤打刻がまだです",
  ALREADY_CLOCKED_OUT: "すでに退勤済みです",
  BREAK_ALREADY_STARTED: "すでに休憩中です",
  BREAK_ALREADY_FINISHED: "休憩は終了済みです（MVPでは1回のみ対応）",
  BREAK_NOT_STARTED: "休憩が開始されていません",
  BREAK_ALREADY_ENDED: "すでに休憩終了済みです",
  BREAK_IN_PROGRESS: "休憩中は退勤できません。先に休憩を終了してください",
  MONTH_CLOSED: "対象月は締め処理済みです。修正が必要な場合は管理者へお問い合わせください",

  // Corrections
  INVALID_INPUT: "入力内容に不備があります。内容をご確認ください",
  NOT_FOUND: "対象のデータが見つかりません",
  ALREADY_DECIDED: "この申請はすでに処理済みです",

  // Generic
  UNKNOWN: "予期しないエラーが発生しました。しばらくしてから再度お試しください",
} as const;

/** Labels for punch actions (used in toast, audit log, etc.) */
export const PUNCH_LABELS: Record<string, string> = {
  CLOCK_IN: "出勤",
  BREAK_START: "休憩開始",
  BREAK_END: "休憩終了",
  CLOCK_OUT: "退勤",
} as const;
