<p align="center">
  <h1 align="center">Workforce Nexus</h1>
  <p align="center">マルチテナント対応 SaaS 勤怠管理システム</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Stripe-課金-635bff?logo=stripe&logoColor=white" alt="Stripe" />
</p>

**本番 URL:** https://workforce-app-two.vercel.app

---

## Overview

従業員の出退勤・休憩打刻、日報提出、勤怠修正申請、月次締め、CSVエクスポートを備えた SaaS 型 Web アプリです。
テナント（会社）ごとにデータを完全分離し、セルフ登録 → トライアル → Stripe 課金 → 本番運用の流れを提供します。

### 主な機能

| カテゴリ | 機能 | 説明 |
|---------|------|------|
| **勤怠** | 打刻 | 出勤 / 休憩開始 / 休憩終了 / 退勤をワンクリックで記録 |
| | 勤怠履歴 | 直近 7 日間の打刻データを一覧表示 |
| | 修正申請 | 従業員が時刻の修正を申請 → 管理者/承認者が承認・却下 |
| | 月次締め | 管理者が当月の勤怠データをロックし編集を防止 |
| | CSVエクスポート | 勤怠・日報データを月指定で CSV ダウンロード（BOM付きUTF-8） |
| **日報** | 日報作成 | ルート・対応件数・インシデント等を入力し、下書き保存または提出 |
| **SaaS** | セルフ登録 | 会社が自分で登録 → 30日トライアル開始 |
| | Stripe 課金 | Checkout / Webhook / Billing Portal による自動課金管理 |
| | アカウント停止 | SUSPENDED プランのテナントは自動的に機能ブロック |
| | パスワードリセット | メール経由のセルフサービスリセット |
| **管理** | メンバー管理 | ADMIN がメンバーの追加・退社・ロール変更を実行 |
| | 監査ログ | 全操作（メンバー追加・権限変更・プラン変更等）を記録 + 閲覧 UI |
| | Super Admin | 全テナントの KPI ダッシュボード・プラン変更・監査ログ閲覧 |
| **その他** | マルチテナント | テナント単位でデータを完全分離 |
| | PWA | スマートフォンのホーム画面に追加してスタンドアロン起動 |

### ロール

| ロール | 打刻 | 日報 | 修正申請 | 承認/却下 | CSV | 月次締め | メンバー管理 | 課金管理 | 全テナント管理 |
|--------|------|------|----------|----------|-----|---------|------------|----------|--------------|
| `EMPLOYEE` | o | o | o | x | x | x | x | x | x |
| `APPROVER` | o | o | o | o | o | x | x | x | x |
| `ADMIN` | o | o | o | o | o | o | o | o | x |
| `SUPER_ADMIN` | — | — | — | — | — | — | — | — | o |

---

## Tech Stack

```
Frontend :  Next.js 16 (App Router / Turbopack) / React 19 / TypeScript 5
Backend  :  Next.js API Routes
DB       :  PostgreSQL + Prisma ORM 6
Auth     :  NextAuth.js v5 (JWT + Credentials)
Billing  :  Stripe (Checkout / Webhooks / Billing Portal)
Charts   :  Recharts
Validate :  Zod 4
Test     :  Vitest
Email    :  Resend (optional)
Style    :  グローバル CSS (ライト/ダークモード自動切替)
PWA      :  Web App Manifest (standalone)
Deploy   :  Vercel
```

---

## Quick Start

ターミナルで以下をコピー＆ペーストすれば、そのまま起動できます。

```bash
# 1. クローン＆インストール
git clone https://github.com/nexus-core-jp/workforce-app.git
cd workforce-app
npm install

# 2. 環境変数を設定（DATABASE_URL だけ書き換えてください）
cp .env.example .env
sed -i '' "s|AUTH_SECRET=.*|AUTH_SECRET=\"$(openssl rand -base64 32)\"|" .env
# ↑ AUTH_SECRET は自動生成されます
# ↓ DATABASE_URL は .env を開いて自分の PostgreSQL 接続文字列に書き換えてください
#   例: DATABASE_URL="postgresql://user:pass@localhost:5432/workforce_app"

# 3. DB セットアップ＆デモデータ投入（一括実行）
npx prisma generate && npx prisma migrate deploy && npm run db:seed

# 4. 起動！
npm run dev
```

**http://localhost:3002** を開いてログインしてください。

> **補足:** Stripe 課金やメール送信は任意です。`.env` の `STRIPE_*` / `RESEND_*` を空のままにしておけばスキップされます。

---

## デモログイン

シード実行後、以下の 4 アカウントでログインできます。
ログイン画面では **会社ID (テナント)**・**メールアドレス**・**パスワード** の 3 項目を入力します。

| ロール | 会社ID | メール | パスワード |
|--------|--------|--------|-----------|
| Super Admin | `__platform` | `super@platform.local` | `superadmin123` |
| 管理者 (ADMIN) | `demo` | `admin@demo.local` | `password123` |
| 従業員 (EMPLOYEE) | `demo` | `tanaka@demo.local` | `password123` |
| 承認者 (APPROVER) | `demo` | `suzuki@demo.local` | `password123` |

> **Super Admin** → `/super-admin` で全テナントの KPI・監査ログ・プラン管理。
> **管理者** → `/admin` でメンバー管理・課金・監査ログ・CSV エクスポート。
> **従業員** → `/dashboard` で打刻・日報・修正申請。

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

### 月次締め

- ADMIN が「今月を締める」を実行すると、当月の打刻・修正申請がロックされます

### パスワードリセット

1. ログイン画面の「パスワードをお忘れですか？」をクリック
2. 会社ID + メールアドレスを入力 → リセットリンクがメールで届く
3. リンクから新しいパスワードを設定

### Stripe 課金

1. 管理者が `/admin/billing` で「有料プランにアップグレード」をクリック
2. Stripe Checkout で決済 → 自動的に ACTIVE プランに切替
3. 支払い失敗時は自動で SUSPENDED → 機能がブロックされる
4. 「支払い管理」から Stripe Billing Portal でカード変更・解約が可能

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
│   ├── auth.ts                          NextAuth 設定 (JWT + Credentials)
│   ├── middleware.ts                    SUSPENDED プラン強制リダイレクト
│   ├── app/
│   │   ├── layout.tsx                   ルートレイアウト
│   │   ├── page.tsx                     ルートページ (リダイレクト)
│   │   ├── globals.css                  グローバルスタイル (ダークモード対応)
│   │   ├── Logo.tsx                     ブランドロゴコンポーネント
│   │   │
│   │   ├── login/                       ログイン画面
│   │   ├── register/                    新規会社登録 (セルフサービス)
│   │   ├── forgot-password/             パスワードリセット申請
│   │   ├── reset-password/              パスワード再設定
│   │   ├── suspended/                   アカウント停止ページ
│   │   │
│   │   ├── dashboard/                   従業員ダッシュボード
│   │   │   ├── page.tsx                 メイン画面 (SSR)
│   │   │   ├── TimeClock.tsx            打刻コンポーネント
│   │   │   ├── History.tsx              打刻履歴
│   │   │   ├── DailyReportPanel.tsx     日報パネル
│   │   │   ├── ClosePanel.tsx           月次締めパネル
│   │   │   └── CorrectionsPanel.tsx     修正申請パネル
│   │   │
│   │   ├── admin/                       テナント管理者画面
│   │   │   ├── page.tsx                 管理者ダッシュボード (SSR)
│   │   │   ├── AdminCorrections.tsx     修正申請一覧 (承認/却下)
│   │   │   ├── AdminDailyReports.tsx    日報一覧
│   │   │   ├── ExportPanel.tsx          CSVエクスポート
│   │   │   ├── members/                 メンバー管理 (追加/退社/ロール変更)
│   │   │   ├── billing/                 課金管理 (Stripe Checkout/Portal)
│   │   │   └── audit-logs/              テナント監査ログ閲覧
│   │   │
│   │   ├── super-admin/                 Super Admin 画面
│   │   │   ├── page.tsx                 KPI ダッシュボード + テナント一覧
│   │   │   ├── KpiCards.tsx             KPI サマリーカード (4種)
│   │   │   ├── KpiCharts.tsx            KPI グラフ (recharts: 棒/円/折れ線)
│   │   │   ├── tenants/[id]/            テナント詳細 + プラン変更
│   │   │   └── audit-logs/              全テナント横断 監査ログ閲覧
│   │   │
│   │   ├── daily-reports/new/           日報作成画面
│   │   ├── corrections/new/             修正申請画面
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/      NextAuth エンドポイント
│   │       ├── auth/forgot-password/    POST  パスワードリセット申請
│   │       ├── auth/reset-password/     POST  パスワード変更
│   │       ├── register/                POST  新規会社登録
│   │       ├── time-entry/punch/        POST  打刻
│   │       ├── daily-reports/           GET/POST  日報
│   │       ├── attendance-corrections/  POST  修正申請
│   │       ├── attendance-corrections/decide/  POST  承認・却下
│   │       ├── close/                   POST  月次締め
│   │       ├── admin/export/            GET   CSVエクスポート
│   │       ├── admin/members/           POST/PATCH  メンバー管理
│   │       ├── stripe/checkout/         POST  Stripe Checkout Session 作成
│   │       ├── stripe/webhook/          POST  Stripe Webhook 受信
│   │       ├── stripe/portal/           POST  Stripe Billing Portal
│   │       └── super-admin/tenants/[id]/plan/  POST  プラン変更
│   │
│   ├── lib/
│   │   ├── db.ts                        Prisma シングルトン
│   │   ├── stripe.ts                    Stripe クライアント (lazy init)
│   │   ├── email.ts                     メール送信 (Resend)
│   │   ├── session.ts                   セッション型定義 & パーサー
│   │   ├── jst.ts                       JST タイムゾーン処理
│   │   ├── time.ts                      時刻ユーティリティ
│   │   ├── close.ts                     月次締め判定
│   │   └── csv.ts                       CSV 生成ヘルパー (BOM付きUTF-8)
│   │
│   ├── generated/prisma/                Prisma 生成ファイル
│   └── __tests__/                       ユニットテスト
│
├── prisma/
│   ├── schema.prisma                    データベーススキーマ (14 モデル)
│   ├── seed.ts                          デモデータ投入
│   └── migrations/                      マイグレーション履歴
│
├── public/
│   ├── manifest.json                    PWA マニフェスト
│   ├── icon-192.png
│   └── icon-512.png
│
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

### 認証・登録

#### `POST /api/register`
新規会社登録。30日間のトライアルが開始されます。
```json
{ "companyName": "会社名", "slug": "company-id", "adminName": "管理者名", "email": "admin@example.com", "password": "password123" }
```

#### `POST /api/auth/forgot-password`
パスワードリセットトークンを発行しメール送信。ユーザー不在でも 200 を返します。
```json
{ "tenant": "company-id", "email": "user@example.com" }
```

#### `POST /api/auth/reset-password`
トークン検証後にパスワードを変更。
```json
{ "token": "reset-token-uuid", "password": "newpassword123" }
```

### 勤怠

#### `POST /api/time-entry/punch`
打刻を記録します。
```json
{ "action": "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT" }
```

#### `GET/POST /api/daily-reports`
日報の取得・作成/更新を行います。
```json
{ "date": "2026-02-23", "route": "ルートA", "cases": 5, "workHoursText": "8時間", "incidentsText": "なし", "notesText": "特記なし", "announcementsText": "", "submit": true }
```

#### `POST /api/attendance-corrections`
修正申請を作成します。
```json
{ "date": "2026-02-23", "requestedClockInAt": "2026-02-23T00:00:00Z", "requestedClockOutAt": "2026-02-23T09:00:00Z", "reason": "打刻忘れ" }
```

#### `POST /api/attendance-corrections/decide`
修正申請を承認・却下します。(ADMIN / APPROVER のみ)
```json
{ "id": "<correctionId>", "decision": "APPROVED" | "REJECTED" }
```

#### `POST /api/close`
当月を締めます。(ADMIN のみ)
```json
{ "month": "2026-02" }
```

#### `GET /api/admin/export`
勤怠・日報データを CSV ダウンロード。(ADMIN / APPROVER のみ)
```
GET /api/admin/export?type=attendance&month=2026-02
GET /api/admin/export?type=daily-reports&month=2026-02
```

### メンバー管理

#### `POST /api/admin/members`
メンバーを追加します。(ADMIN のみ)
```json
{ "name": "新メンバー", "email": "new@example.com", "password": "password123", "role": "EMPLOYEE" }
```

#### `PATCH /api/admin/members`
メンバーの退社・復帰・ロール変更。(ADMIN のみ)
```json
{ "userId": "<userId>", "action": "deactivate" | "reactivate" | "changeRole", "role": "APPROVER" }
```

### Stripe 課金

#### `POST /api/stripe/checkout`
Stripe Checkout Session を作成し URL を返します。(ADMIN のみ)

#### `POST /api/stripe/webhook`
Stripe Webhook 受信。認証不要（Stripe 署名検証のみ）。
- `checkout.session.completed` → plan = ACTIVE
- `invoice.payment_failed` → plan = SUSPENDED
- `customer.subscription.deleted` → plan = SUSPENDED

#### `POST /api/stripe/portal`
Stripe Billing Portal Session を作成し URL を返します。(ADMIN のみ)

### Super Admin

#### `POST /api/super-admin/tenants/[id]/plan`
テナントのプランを変更します。(SUPER_ADMIN のみ)
```json
{ "plan": "TRIAL" | "ACTIVE" | "SUSPENDED" }
```

---

## Database Schema

### 主要モデル (14)

| モデル | 説明 |
|--------|------|
| `Tenant` | テナント (会社/組織) + Stripe 連携フィールド |
| `User` | ユーザー (テナントごとにメール一意) |
| `PasswordResetToken` | パスワードリセットトークン (1時間有効) |
| `Department` | 部署 (承認者の指定可) |
| `ShiftPattern` | シフトパターン (開始/終了時刻, 休憩時間) |
| `ShiftAssignment` | ユーザーへのシフト割り当て |
| `TimeEntry` | 打刻記録 (出勤/退勤/休憩/労働時間) |
| `DailyReport` | 日報 (下書き/提出済み) |
| `AttendanceCorrection` | 勤怠修正申請 (承認待ち/承認/却下) |
| `LeaveRequest` | 休暇申請 (有休/半休/時間休/欠勤) |
| `LeaveLedgerEntry` | 有休残日数の台帳 |
| `Close` | 月次締め記録 |
| `AuditLog` | 監査ログ (before/after JSON 付き) |

### マルチテナント

すべてのデータは `tenantId` で分離されます。クエリには必ず `tenantId` フィルタが含まれ、テナント間のデータ漏洩を防止します。

---

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `DATABASE_URL` | o | PostgreSQL 接続文字列 |
| `AUTH_SECRET` | o | NextAuth 署名キー (32文字以上) |
| `AUTH_URL` | o | アプリの URL (例: `http://localhost:3002`) |
| `RESEND_API_KEY` | | Resend API キー (メール送信用) |
| `NOTIFICATION_EMAIL` | | 新規登録通知の送信先 |
| `STRIPE_SECRET_KEY` | | Stripe シークレットキー |
| `STRIPE_PUBLISHABLE_KEY` | | Stripe 公開キー |
| `STRIPE_WEBHOOK_SECRET` | | Stripe Webhook 署名シークレット |
| `STRIPE_PRICE_ID` | | Stripe サブスクリプション価格 ID |

---

## Deploy

### Vercel (推奨・現在稼働中)

本番 URL: https://workforce-app-two.vercel.app

1. リポジトリを Vercel に接続（GitHub 連携済み — main push で自動デプロイ）
2. 環境変数を設定: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
3. Build Command はデフォルトのまま（`postinstall` で `prisma generate` が自動実行）

### セルフホスト

```bash
npm run build
npm start     # port 3002
```

Node.js 20+ が必要です。

---

## License

Private
