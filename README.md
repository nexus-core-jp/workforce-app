# Workforce App

マルチテナント対応の勤怠管理システム。

## 技術スタック

- **Next.js 16** (App Router / Server Components)
- **TypeScript 5** (strict mode)
- **Prisma 6** + PostgreSQL
- **next-auth 5** (JWT / Credentials)
- **Zod 4** (バリデーション)
- **Vitest** (テスト)

## セットアップ

```bash
npm install
cp .env.example .env   # DATABASE_URL, AUTH_SECRET, AUTH_URL を設定
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

## デモアカウント (seed後)

| ロール | メール | パスワード |
|--------|--------|------------|
| ADMIN | admin@demo.local | password123 |
| EMPLOYEE | employee@demo.local | password123 |
| APPROVER | approver@demo.local | password123 |

Tenant slug: `demo`

## npm スクリプト

| コマンド | 内容 |
|----------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | プロダクションビルド |
| `npm start` | プロダクション起動 |
| `npm test` | テスト実行 |
| `npm run typecheck` | 型チェック |
| `npm run lint` | ESLint |
| `npm run db:seed` | デモデータ投入 |

## 主要機能

- 打刻 (出勤 / 休憩 / 退勤)
- 直近7日の勤怠履歴
- 打刻修正申請 (時刻指定 + 理由)
- 修正承認/却下 (自己承認防止付き)
- 月次締め (ADMIN のみ)
- ユーザー管理 (ADMIN)
- パスワード変更
- 監査ログ

## デプロイ

### Vercel (推奨)

1. リポジトリを Vercel に接続
2. 環境変数を設定 (`DATABASE_URL`, `AUTH_SECRET`)
3. デプロイ

### Docker

```bash
docker build -t workforce-app .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  workforce-app
```

## API エンドポイント

| メソッド | パス | 内容 |
|----------|------|------|
| POST | `/api/time-entry/punch` | 打刻 |
| POST | `/api/attendance-corrections` | 修正申請 |
| POST | `/api/attendance-corrections/decide` | 承認/却下 |
| POST | `/api/close` | 月次締め |
| GET/POST | `/api/users` | ユーザー一覧/作成 |
| POST | `/api/users/change-password` | パスワード変更 |
| GET | `/api/health` | ヘルスチェック |
