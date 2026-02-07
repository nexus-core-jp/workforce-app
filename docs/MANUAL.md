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
