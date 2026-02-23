<p align="center">
  <h1 align="center">Workforce</h1>
  <p align="center">マルチテナント対応 勤怠管理システム</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

---

## Overview

従業員の出退勤・休憩を打刻し、勤怠修正申請や月次締めを行うWebアプリです。
テナント（会社）ごとにデータを完全分離し、ロールに応じたアクセス制御を備えています。

### 主な機能

| 機能 | 説明 |
|------|------|
| **打刻** | 出勤 / 休憩開始 / 休憩終了 / 退勤をワンクリックで記録 |
| **勤怠履歴** | 直近 7 日間の打刻データを一覧表示 |
| **修正申請** | 従業員が時刻の修正を申請 → 管理者/承認者が承認・却下 |
| **月次締め** | 管理者が当月の勤怠データをロックし編集を防止 |
| **監査ログ** | 承認・却下・締め操作の履歴を自動記録 |
| **マルチテナント** | テナント単位でデータを完全分離 |

### ロール

| ロール | できること |
|--------|-----------|
| `EMPLOYEE` | 打刻、自分の履歴閲覧、修正申請 |
| `APPROVER` | 上記 + 修正申請の承認・却下 |
| `ADMIN` | 全権限 + 月次締め |

---

## Tech Stack

```
Frontend :  Next.js 16 (App Router) / React 19 / TypeScript 5
Backend  :  Next.js API Routes
DB       :  PostgreSQL + Prisma ORM 6
Auth     :  NextAuth.js v5 (JWT + Credentials)
Validate :  Zod
Test     :  Vitest (25 tests)
CI       :  GitHub Actions (lint → typecheck → test → build)
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/nexus-core-jp/workforce-app.git
cd workforce-app
npm install
```

### 2. 環境変数

```bash
cp .env.example .env
```

`.env` を編集して以下を設定:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
AUTH_SECRET="<32文字以上のランダム文字列>"
AUTH_URL="http://localhost:3002"
```

> `AUTH_SECRET` の生成: `openssl rand -base64 32`

### 3. データベース準備

```bash
npm run prisma:generate   # Prisma クライアント生成
npm run prisma:migrate    # マイグレーション実行
npm run db:seed           # デモデータ投入
```

### 4. 起動

```bash
npm run dev
```

**http://localhost:3002** でアクセスできます。

### 5. デモログイン

| 項目 | 値 |
|------|-----|
| 会社ID | `demo` |
| メール | `admin@demo.local` |
| パスワード | `password123` |

---

## 使い方

### 打刻の流れ

```
出勤 → (業務) → 休憩開始 → 休憩終了 → (業務) → 退勤
```

- ダッシュボード上のボタンで打刻します
- 状態に応じてボタンが有効/無効になります
- 労働時間は `(退勤 - 出勤) - 休憩時間` で自動計算されます

### 修正申請

1. 履歴一覧から「修正申請」をクリック
2. 修正したい時刻を入力し、理由を記入して申請
3. ADMIN / APPROVER が承認すると TimeEntry に自動反映

### 月次締め

- ADMIN が「今月を締める」を実行すると、当月の打刻・修正申請がロックされます
- 締め後の変更は修正申請フローが必要です

---

## Scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー (port 3002) |
| `npm run build` | プロダクションビルド |
| `npm start` | プロダクションサーバー |
| `npm run lint` | ESLint |
| `npm test` | テスト実行 |
| `npm run test:watch` | テスト (watch) |
| `npm run prisma:studio` | DB GUI (Prisma Studio) |

---

## Project Structure

```
workforce-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── time-entry/punch/       POST  打刻
│   │   │   ├── attendance-corrections/  POST  修正申請
│   │   │   ├── attendance-corrections/decide/  POST  承認・却下
│   │   │   └── close/                  POST  月次締め
│   │   ├── dashboard/       メイン画面 (SSR)
│   │   ├── corrections/     修正申請画面
│   │   └── login/           ログイン画面
│   ├── lib/
│   │   ├── db.ts            Prisma client
│   │   ├── session.ts       セッション型定義
│   │   ├── jst.ts           JST タイムゾーン処理
│   │   ├── time.ts          時刻ユーティリティ
│   │   └── close.ts         月次締め判定
│   └── __tests__/           ユニットテスト
├── prisma/
│   ├── schema.prisma        データベーススキーマ (13 テーブル)
│   ├── seed.ts              デモデータ
│   └── migrations/
├── .github/workflows/ci.yml CI パイプライン
└── docs/
    ├── MANUAL.md             開発マニュアル
    └── QUALITY_CHECKLIST.md  品質チェックリスト
```

---

## API Reference

### `POST /api/time-entry/punch`

打刻を記録します。

```json
{ "action": "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT" }
```

| Status | 意味 |
|--------|------|
| 200 | `{ ok: true, entry: TimeEntry }` |
| 401 | 未認証 |
| 409 | 状態不正（既に出勤済み、月が締め済み等） |

### `POST /api/attendance-corrections`

修正申請を作成します。

```json
{
  "date": "2026-02-23",
  "requestedClockInAt": "2026-02-23T00:00:00Z",
  "requestedClockOutAt": "2026-02-23T09:00:00Z",
  "reason": "打刻忘れ"
}
```

### `POST /api/attendance-corrections/decide`

修正申請を承認・却下します。(ADMIN / APPROVER のみ)

```json
{ "id": "<correctionId>", "decision": "APPROVED" | "REJECTED" }
```

### `POST /api/close`

当月を締めます。(ADMIN のみ)

```json
{ "month": "2026-02" }
```

---

## Deploy

### Vercel (推奨)

1. リポジトリを Vercel に接続
2. 環境変数を設定: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
3. Build Command: `npx prisma generate && npm run build`

### セルフホスト

```bash
npm run build
npm start     # port 3002
```

Node.js 20+ が必要です。

---

## License

Private
