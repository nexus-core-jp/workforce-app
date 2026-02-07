# workforce-app manual (dev)

## 0. 前提
- Node.js / npm
- Postgres（Neon推奨）

## 1. セットアップ

```bash
cd workforce-app
npm i
```

### .env
`workforce-app/.env` を作成/編集。

最低限：
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`

例：
```env
DATABASE_URL="postgresql://...neon.../neondb?sslmode=require"
AUTH_SECRET="(32bytes以上のランダム)"
AUTH_URL="http://localhost:3000"
```

## 2. DBマイグレーション / seed

```bash
npx prisma migrate dev
npm run seed
```

seed後、デモログインが作られます：
- tenant: `demo`
- email: `admin@demo.local`
- password: `password123`

## 3. 起動

```bash
npm run dev
```

- http://localhost:3000/login

## 4. 画面の使い方（MVP）

### ログイン
- 会社ID（tenant）: `demo`
- メール: `admin@demo.local`
- パスワード: `password123`

### 打刻
`/dashboard` に「打刻」ボタンがあります。

- 出勤 → CLOCK_IN
- 休憩開始 → BREAK_START
- 休憩終了 → BREAK_END
- 退勤 → CLOCK_OUT

制約（MVP）
- 休憩は **1回のみ対応**（複数休憩は後で拡張）
- 休憩中は退勤できない（休憩終了が必要）

### 今日の打刻の保存仕様
- `TimeEntry.date` は「JSTの日付（00:00 JST）」をUTC Dateとして保存（date-only semantics）
- `clockInAt/breakStartAt/breakEndAt/clockOutAt` は押した時刻（DateTime）

## 5. API（開発向け）

### POST /api/time-entry/punch
```json
{ "action": "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT" }
```

- 正常: `{ ok: true, entry: TimeEntry }`
- 異常: `{ ok: false, error: string }` + status 409/400/401

## 6. 直近7日履歴
- `/dashboard` に直近7日の打刻一覧が表示されます
- 各行の「修正申請」から、対象日の修正申請（新規）へ遷移できます

## 7. 打刻修正申請（MVP）
### 申請（従業員）
- `/corrections/new?date=YYYY-MM-DD`
- MVPでは「理由」だけ必須（時刻入力UIは後で拡張）

### 承認（ADMIN/APPROVER）
- `/dashboard` に「打刻修正申請（承認）」が表示され、未処理を承認/却下できます
- MVPでは **承認しても TimeEntry へ反映はまだしません**（次の実装で対応）

## 8. 締め（Close）
### 締め操作（ADMIN）
- `/dashboard` の「締め（管理者）」から当月を締められます

### 締め後の挙動
- 当月が締め済みの場合：
  - 打刻API（/api/time-entry/punch）は 409 を返して更新できません
  - 修正申請API（/api/attendance-corrections）も 409 を返します
