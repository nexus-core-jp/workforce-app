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

従業員の出退勤・休憩を打刻し、日報提出・勤怠修正申請・月次締め・CSVエクスポートを行うWebアプリです。
テナント（会社）ごとにデータを完全分離し、ロールに応じたアクセス制御を備えています。

### 主な機能

| 機能 | 説明 |
|------|------|
| **打刻** | 出勤 / 休憩開始 / 休憩終了 / 退勤をワンクリックで記録 |
| **勤怠履歴** | 直近 7 日間の打刻データを一覧表示 |
| **日報** | ルート・対応件数・インシデント等を入力し、下書き保存または提出 |
| **修正申請** | 従業員が時刻の修正を申請 → 管理者/承認者が承認・却下 |
| **CSVエクスポート** | 勤怠データ・日報データを月指定でCSVダウンロード |
| **月次締め** | 管理者が当月の勤怠データをロックし編集を防止 |
| **監査ログ** | 承認・却下・締め操作の履歴を自動記録 |
| **マルチテナント** | テナント単位でデータを完全分離 |
| **PWA** | スマートフォンのホーム画面に追加してスタンドアロン起動 |

### ロール

| ロール | 打刻 | 日報 | 修正申請 | 承認/却下 | CSVエクスポート | 月次締め |
|--------|------|------|----------|----------|---------------|---------|
| `EMPLOYEE` | o | o | o | x | x | x |
| `APPROVER` | o | o | o | o | o | x |
| `ADMIN` | o | o | o | o | o | o |

---

## Tech Stack

```
Frontend :  Next.js 16 (App Router / Turbopack) / React 19 / TypeScript 5
Backend  :  Next.js API Routes
DB       :  PostgreSQL + Prisma ORM 6
Auth     :  NextAuth.js v5 (JWT + Credentials)
Validate :  Zod 4
Test     :  Vitest
Style    :  グローバル CSS (ライト/ダークモード自動切替)
PWA      :  Web App Manifest (standalone)
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

---

## デモログイン

シード実行後、以下の 3 アカウントでログインできます。
ログイン画面では **会社ID (テナント)**・**メールアドレス**・**パスワード** の 3 項目を入力します。

| ロール | 会社ID | メール | パスワード |
|--------|--------|--------|-----------|
| 管理者 (ADMIN) | `demo` | `admin@demo.local` | `password123` |
| 従業員 (EMPLOYEE) | `demo` | `tanaka@demo.local` | `password123` |
| 承認者 (APPROVER) | `demo` | `suzuki@demo.local` | `password123` |

> 管理者でログインすると `/admin` から全機能を確認できます。
> 従業員でログインすると打刻・日報・修正申請の従業員フローを確認できます。

---

## 使い方

### 打刻の流れ

```
出勤 → (業務) → 休憩開始 → 休憩終了 → (業務) → 退勤
```

- ダッシュボード上のボタンで打刻します
- 状態に応じてボタンが有効/無効になります（ステートマシン制御）
- 労働時間は `(退勤 - 出勤) - 休憩時間` で自動計算されます

### 日報

1. ダッシュボードまたは `/daily-reports/new` から日報を作成
2. ルート・対応件数・勤務時間・インシデント・備考・連絡事項を入力
3. 「下書き保存」で一時保存、「提出」で提出済みに変更
4. 提出された日報は管理者画面 `/admin` に一覧表示されます

### 修正申請

1. 履歴一覧から「修正申請」をクリック
2. 修正したい時刻を入力し、理由を記入して申請
3. ADMIN / APPROVER が承認すると TimeEntry に自動反映

### CSVエクスポート

1. 管理者画面 `/admin` の「CSVエクスポート」セクションで対象月を選択
2. 「勤怠CSV」または「日報CSV」ボタンをクリックしてダウンロード
3. BOM付き UTF-8 で出力されるため、Excel で文字化けなく開けます

**勤怠CSV列:** 日付, 社員名, メール, 出勤, 退勤, 休憩開始, 休憩終了, 労働時間(分), ステータス

**日報CSV列:** 日付, 社員名, メール, ルート, 対応件数, 勤務時間, インシデント, 備考, 連絡事項, ステータス, 提出日時

### 月次締め

- ADMIN が「今月を締める」を実行すると、当月の打刻・修正申請がロックされます
- 締め後の変更は修正申請フローが必要です

---

## Scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー (port 3002) |
| `npm run build` | プロダクションビルド |
| `npm start` | プロダクションサーバー (port 3002) |
| `npm run lint` | ESLint |
| `npm test` | テスト実行 |
| `npm run test:watch` | テスト (watch) |
| `npm run prisma:generate` | Prisma クライアント生成 |
| `npm run prisma:migrate` | マイグレーション実行 |
| `npm run prisma:studio` | DB GUI (Prisma Studio) |
| `npm run db:seed` | デモデータ投入 |

---

## Project Structure

```
workforce-app/
├── src/
│   ├── auth.ts                        NextAuth 設定 (JWT + Credentials)
│   ├── app/
│   │   ├── layout.tsx                 ルートレイアウト
│   │   ├── page.tsx                   ルートページ (リダイレクト)
│   │   ├── globals.css                グローバルスタイル (ダークモード対応)
│   │   ├── login/                     ログイン画面
│   │   ├── dashboard/                 従業員ダッシュボード
│   │   │   ├── page.tsx               メイン画面 (SSR)
│   │   │   ├── TimeClock.tsx          打刻コンポーネント
│   │   │   ├── History.tsx            打刻履歴
│   │   │   ├── DailyReportPanel.tsx   日報パネル
│   │   │   ├── ClosePanel.tsx         月次締めパネル
│   │   │   └── CorrectionsPanel.tsx   修正申請パネル
│   │   ├── admin/                     管理者画面
│   │   │   ├── page.tsx               管理者ダッシュボード (SSR)
│   │   │   ├── AdminCorrections.tsx   修正申請一覧 (承認/却下)
│   │   │   ├── AdminDailyReports.tsx  日報一覧
│   │   │   └── ExportPanel.tsx        CSVエクスポート
│   │   ├── daily-reports/new/         日報作成画面
│   │   ├── corrections/new/           修正申請画面
│   │   └── api/
│   │       ├── auth/[...nextauth]/    NextAuth エンドポイント
│   │       ├── time-entry/punch/      POST  打刻
│   │       ├── daily-reports/         GET/POST  日報
│   │       ├── attendance-corrections/       POST  修正申請
│   │       ├── attendance-corrections/decide/ POST  承認・却下
│   │       ├── close/                 POST  月次締め
│   │       └── admin/export/          GET   CSVエクスポート
│   ├── lib/
│   │   ├── db.ts                      Prisma シングルトン
│   │   ├── session.ts                 セッション型定義 & パーサー
│   │   ├── jst.ts                     JST タイムゾーン処理
│   │   ├── time.ts                    時刻ユーティリティ
│   │   ├── close.ts                   月次締め判定
│   │   └── csv.ts                     CSV 生成ヘルパー (BOM付きUTF-8)
│   ├── generated/prisma/              Prisma 生成ファイル
│   └── __tests__/                     ユニットテスト
├── prisma/
│   ├── schema.prisma                  データベーススキーマ (13 テーブル)
│   ├── seed.ts                        デモデータ投入
│   └── migrations/
├── public/
│   ├── manifest.json                  PWA マニフェスト
│   ├── icon-192.png
│   └── icon-512.png
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── prisma.config.ts
└── vitest.config.ts
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

### `GET/POST /api/daily-reports`

日報の取得・作成/更新を行います。

```json
{
  "date": "2026-02-23",
  "route": "ルートA",
  "cases": 5,
  "workHoursText": "8時間",
  "incidentsText": "なし",
  "notesText": "特記なし",
  "announcementsText": "",
  "submit": true
}
```

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

### `GET /api/admin/export`

勤怠データ・日報データをCSVでダウンロードします。(ADMIN / APPROVER のみ)

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `type` | o | `attendance` (勤怠) または `daily-reports` (日報) |
| `month` | o | `YYYY-MM` 形式 (例: `2026-02`) |

```
GET /api/admin/export?type=attendance&month=2026-02
GET /api/admin/export?type=daily-reports&month=2026-02
```

レスポンス: `Content-Type: text/csv; charset=utf-8` + `Content-Disposition: attachment`

---

## Database Schema

### 主要モデル

| モデル | 説明 |
|--------|------|
| `Tenant` | テナント (会社/組織) |
| `User` | ユーザー (テナントごとにメール一意) |
| `Department` | 部署 (承認者の指定可) |
| `ShiftPattern` | シフトパターン (開始/終了時刻, 休憩時間) |
| `ShiftAssignment` | ユーザーへのシフト割り当て |
| `TimeEntry` | 打刻記録 (出勤/退勤/休憩/労働時間) |
| `DailyReport` | 日報 (下書き/提出済み) |
| `AttendanceCorrection` | 勤怠修正申請 (承認待ち/承認/却下) |
| `LeaveRequest` | 休暇申請 (有休/半休/時間休/欠勤) |
| `LeaveLedgerEntry` | 有休残日数の台帳 |
| `Close` | 月次締め記録 |
| `AuditLog` | 監査ログ |

### マルチテナント

すべてのデータは `tenantId` で分離されます。クエリには必ず `tenantId` フィルタが含まれ、テナント間のデータ漏洩を防止します。

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
