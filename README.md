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

## 目次

1. [概要](#概要)
2. [機能一覧](#機能一覧)
3. [Tech Stack](#tech-stack)
4. [ローカルセットアップ](#ローカルセットアップ)
5. [本番デプロイ](#本番デプロイ)
6. [環境変数リファレンス](#環境変数リファレンス)
7. [Stripe 課金セットアップ](#stripe-課金セットアップ)
8. [運用マニュアル](#運用マニュアル)
9. [API リファレンス](#api-リファレンス)
10. [データベース](#データベース)
11. [プロジェクト構成](#プロジェクト構成)
12. [スクリプト一覧](#スクリプト一覧)

---

## 概要

Workforce Nexus は、従業員の出退勤・休憩打刻、日報提出、勤怠修正申請、月次締め、CSV エクスポートを備えた SaaS 型勤怠管理 Web アプリです。

テナント（会社）ごとにデータを完全分離し、**セルフ登録 → 30日トライアル → Stripe 決済 → 本番運用** の流れを提供します。
SUSPENDED（停止）テナントはページ表示・API 呼び出しの両方がブロックされます。

---

## 機能一覧

### 勤怠管理

| 機能 | 説明 |
|------|------|
| 打刻 | 出勤 / 休憩開始 / 休憩終了 / 退勤をワンタップで記録 |
| 勤怠履歴 | 直近 7 日間の打刻データを一覧表示 |
| 修正申請 | 従業員が時刻修正を申請 → ADMIN が承認・却下 |
| 月次締め | ADMIN が当月をロックし打刻・修正を防止 |
| CSV エクスポート | 勤怠・日報を月指定で CSV ダウンロード (BOM 付き UTF-8) |
| 日報 | ルート・対応件数・インシデント等を下書き保存 or 提出 |

### SaaS 基盤

| 機能 | 説明 |
|------|------|
| セルフ登録 | `/register` から会社登録 → 30日トライアル自動開始 |
| Stripe 課金 | Checkout → Webhook → ACTIVE 自動切替 / 支払い失敗 → SUSPENDED |
| Billing Portal | カード変更・プラン解約を Stripe UI で管理 |
| アカウント停止 | SUSPENDED テナントはページ + API の両方をブロック |
| パスワードリセット | メール経由のセルフサービスリセット (1 時間有効トークン) |

### 管理機能

| 機能 | 説明 |
|------|------|
| メンバー管理 | ADMIN がメンバーの追加・退社・復帰・ロール変更 |
| 監査ログ | 全操作を before/after JSON 付きで記録 + 閲覧 UI |
| KPI ダッシュボード | Super Admin 向け: テナント数・ユーザー数・アクティブ数・グラフ |

### ロールと権限

| ロール | 打刻 | 日報 | 修正申請 | 承認/却下 | CSV | 月次締め | メンバー管理 | 課金管理 | 全テナント管理 |
|--------|:----:|:----:|:--------:|:---------:|:---:|:-------:|:----------:|:--------:|:------------:|
| EMPLOYEE | o | o | o | - | - | - | - | - | - |
| ADMIN | o | o | o | o | o | o | o | o | - |
| SUPER_ADMIN | - | - | - | - | - | - | - | - | o |

---

## Tech Stack

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16 (App Router / Turbopack) / React 19 / TypeScript 5 |
| バックエンド | Next.js API Routes (Server Components + Route Handlers) |
| データベース | PostgreSQL + Prisma ORM 6 |
| 認証 | NextAuth.js v5 (JWT + Credentials) |
| 課金 | Stripe (Checkout / Webhooks / Billing Portal) |
| チャート | Recharts |
| バリデーション | Zod 4 |
| テスト | Vitest |
| メール | Resend (任意) |
| スタイル | グローバル CSS (ライト/ダークモード自動切替) |
| PWA | Web App Manifest (standalone) |
| デプロイ | Vercel |
| CI | GitHub Actions (lint / type-check / test / build) |

---

## ローカルセットアップ

### 前提条件

- **Node.js 20+**
- **PostgreSQL** (ローカルまたはクラウド。[Neon](https://neon.tech) の無料プランでも OK)

### 手順

```bash
# 1. クローン & インストール
git clone https://github.com/nexus-core-jp/workforce-app.git
cd workforce-app
npm install

# 2. 環境変数を設定
cp .env.example .env
# AUTH_SECRET を自動生成
sed -i '' "s|AUTH_SECRET=.*|AUTH_SECRET=\"$(openssl rand -base64 32)\"|" .env
```

`.env` を開いて `DATABASE_URL` を自分の PostgreSQL 接続文字列に書き換えてください。

```env
DATABASE_URL="postgresql://user:password@localhost:5432/workforce_app"
```

> Neon を使う場合: `DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"`

```bash
# 3. DB セットアップ & デモデータ投入
npx prisma generate && npx prisma migrate deploy && npm run db:seed

# 4. 起動
npm run dev
```

**http://localhost:3002** を開いてログインしてください。

### デモアカウント

シード実行後、以下のアカウントでログインできます。
ログイン画面では **会社ID**・**メールアドレス**・**パスワード** の 3 つを入力します。

| ロール | 会社 ID | メール | パスワード | ログイン後の画面 |
|--------|---------|--------|-----------|----------------|
| Super Admin | `__platform` | `super@platform.local` | `superadmin123` | `/super-admin` |
| 管理者 (ADMIN) | `demo` | `admin@demo.local` | `password123` | `/admin` |
| 管理者 (ADMIN) | `demo` | `suzuki@demo.local` | `password123` | `/dashboard` |
| 従業員 (EMPLOYEE) | `demo` | `tanaka@demo.local` | `password123` | `/dashboard` |

> Stripe / Resend は任意です。`.env` の `STRIPE_*` / `RESEND_*` を空のままにすればスキップされます。

---

## 本番デプロイ

### 方法 1: Vercel + Neon (推奨)

最も簡単な構成です。どちらも無料プランがあります。

#### Step 1: Neon でデータベースを作成

1. [neon.tech](https://neon.tech) でアカウント作成
2. 新しいプロジェクトを作成 (リージョン: `ap-southeast-1` 推奨)
3. 接続文字列をコピー:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

#### Step 2: Vercel にデプロイ

1. [vercel.com](https://vercel.com) でリポジトリをインポート
2. **Environment Variables** に以下を設定:

   | 変数 | 値 |
   |------|-----|
   | `DATABASE_URL` | Neon の接続文字列 |
   | `AUTH_SECRET` | `openssl rand -base64 32` で生成した文字列 |
   | `AUTH_URL` | Vercel のデプロイ URL (例: `https://your-app.vercel.app`) |

3. **Deploy** をクリック

> Build Command はデフォルトのまま。`postinstall` で `prisma generate` が自動実行されます。

#### Step 3: DB マイグレーション & シード

デプロイ後、ローカルから実行します。

```bash
# .env の DATABASE_URL を Neon の接続文字列に設定した状態で:
npx prisma migrate deploy
npm run db:seed
```

これで本番環境にテーブルとデモデータが作成されます。

#### Step 4 (任意): カスタムドメイン

1. Vercel ダッシュボード → Settings → Domains
2. ドメインを追加し、DNS レコードを設定
3. `AUTH_URL` を新しいドメインに更新

### 方法 2: セルフホスト (VPS / Docker)

```bash
# ビルド
npm run build

# 起動 (port 3002)
npm start
```

Node.js 20+ と PostgreSQL が必要です。
リバースプロキシ (nginx / Caddy) で HTTPS を設定してください。

### 方法 3: Railway / Render

1. リポジトリを接続
2. 環境変数を設定 (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`)
3. Build Command: `npm run build`
4. Start Command: `npm start`

---

## 環境変数リファレンス

| 変数 | 必須 | 説明 | 例 |
|------|:----:|------|-----|
| `DATABASE_URL` | **必須** | PostgreSQL 接続文字列 | `postgresql://user:pass@host:5432/db` |
| `AUTH_SECRET` | **必須** | NextAuth 署名キー (32 文字以上) | `openssl rand -base64 32` で生成 |
| `AUTH_URL` | **必須** | アプリの公開 URL | `https://your-app.vercel.app` |
| `RESEND_API_KEY` | 任意 | Resend API キー (PW リセットメール用) | `re_xxxx` |
| `NOTIFICATION_EMAIL` | 任意 | 新規登録通知の送信先メール | `admin@example.com` |
| `STRIPE_SECRET_KEY` | 任意 | Stripe シークレットキー | `sk_live_xxxx` |
| `STRIPE_WEBHOOK_SECRET` | 任意 | Stripe Webhook 署名シークレット | `whsec_xxxx` |
| `STRIPE_PRICE_ID` | 任意 | Stripe サブスクリプション価格 ID | `price_xxxx` |

> `STRIPE_*` を設定しない場合、課金ボタンは「Stripe is not configured」エラーを返します。課金なしでも勤怠機能は使えます。

---

## Stripe 課金セットアップ

### 1. Stripe アカウント準備

1. [stripe.com](https://stripe.com) でアカウント作成
2. ダッシュボード → **Products** → 商品を作成 (例: "Workforce Nexus Pro")
3. 価格を追加 (例: 月額 ¥3,000)。作成後の `price_xxxx` を控える

### 2. 環境変数を設定

```env
STRIPE_SECRET_KEY="sk_test_xxxx"       # Stripe ダッシュボード → API keys
STRIPE_PRICE_ID="price_xxxx"           # 上で作成した価格 ID
```

### 3. Webhook を設定

#### ローカル開発

```bash
# Stripe CLI をインストール
brew install stripe/stripe-cli/stripe
stripe login

# Webhook をローカルに転送
stripe listen --forward-to localhost:3002/api/stripe/webhook
```

表示される `whsec_xxxx` を `.env` に設定:

```env
STRIPE_WEBHOOK_SECRET="whsec_xxxx"
```

#### 本番環境

1. Stripe ダッシュボード → **Webhooks** → **Add endpoint**
2. URL: `https://your-app.vercel.app/api/stripe/webhook`
3. イベントを選択:
   - `checkout.session.completed`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. 作成後に表示される Signing secret を `STRIPE_WEBHOOK_SECRET` に設定

### 4. Billing Portal を有効化

1. Stripe ダッシュボード → **Settings** → **Billing** → **Customer portal**
2. ポータルリンクを有効化
3. 顧客がカード変更・プラン解約を自分で行えるようになります

### 課金フロー

```
[TRIAL] → 管理者が「アップグレード」クリック
       → Stripe Checkout で決済
       → Webhook: checkout.session.completed
       → プラン自動切替: ACTIVE

[ACTIVE] → 支払い失敗
         → Webhook: invoice.payment_failed
         → プラン自動切替: SUSPENDED
         → テナント全体の機能ブロック

[SUSPENDED] → 管理者が「再サブスクライブ」クリック
            → Stripe Checkout で再決済
            → プラン自動切替: ACTIVE
```

---

## 運用マニュアル

### テナントのライフサイクル

```
登録 → TRIAL (30日) → ACTIVE (課金中) → SUSPENDED (停止) → ACTIVE (復帰)
```

| 状態 | 条件 | ユーザーへの影響 |
|------|------|-----------------|
| TRIAL | 登録直後。30日間 | 全機能利用可能。バナーで残り日数を表示 |
| ACTIVE | Stripe 決済完了 | 全機能利用可能 |
| SUSPENDED | 支払い失敗 or SA が手動停止 | ページ → `/suspended` にリダイレクト。API → 403 |

### Super Admin (SA) の操作

SA は `__platform` テナントの `SUPER_ADMIN` ロールのユーザーです。

#### SA ダッシュボード (`/super-admin`)

- **KPI カード**: 導入企業数 / 総ユーザー数 / 本日アクティブ / トライアル期限 7 日以内
- **KPI グラフ**: 月別新規登録 (棒) / プラン分布 (円) / 日別アクティブ (折れ線)
- **テナント一覧**: プラン・トライアル残日数・メンバー数を表示

#### プラン変更

1. `/super-admin` → テナント名をクリック
2. プルダウンで `TRIAL` / `ACTIVE` / `SUSPENDED` を選択
3. 「変更」ボタンで即時反映。監査ログに自動記録

> **注意**: プラン変更はデータベースに即時反映されますが、対象テナントのユーザーが現在ログイン中の場合、JWT の有効期限が切れるまで旧プランのまま動作する場合があります。即座に反映するにはユーザーの再ログインが必要です。

#### 監査ログ (`/super-admin/audit-logs`)

全テナント横断で操作履歴を閲覧できます。

- **フィルタ**: テナント / アクション種別 / 日付範囲
- **ページネーション**: 20 件/ページ
- 記録されるアクション: `TENANT_REGISTERED`, `MEMBER_ADDED`, `MEMBER_DEACTIVATED`, `MEMBER_REACTIVATED`, `ROLE_CHANGED`, `PASSWORD_RESET`, `PLAN_CHANGED`, `MONTH_CLOSED`, `CORRECTION_APPROVED`, `CORRECTION_REJECTED`, `STRIPE_CHECKOUT_COMPLETED`, `STRIPE_PAYMENT_FAILED`, `STRIPE_SUBSCRIPTION_DELETED`

### テナント管理者 (ADMIN) の操作

#### メンバー管理 (`/admin/members`)

| 操作 | 手順 |
|------|------|
| メンバー追加 | 名前・メール・パスワード・ロールを入力して「追加」 |
| 退社処理 | メンバー一覧の「退社」ボタン (ログイン不可になる) |
| 復帰 | 「復帰」ボタンで再度有効化 |
| ロール変更 | プルダウンでロール選択 → 「変更」 |

#### 月次締め (`/admin`)

1. 管理者ダッシュボードの「今月を締める」ボタンをクリック
2. 当月の打刻・修正申請がロックされ、編集不可になる
3. 締め済みの月の日報も編集不可

#### CSV エクスポート (`/admin`)

1. 「CSV エクスポート」セクションで年月を選択
2. 「勤怠 CSV」または「日報 CSV」をクリック
3. BOM 付き UTF-8 で出力。Excel でそのまま文字化けなく開けます

#### 課金管理 (`/admin/billing`)

- **TRIAL**: 「有料プランにアップグレード」→ Stripe Checkout
- **ACTIVE**: 「支払い管理 (Stripe)」→ Stripe Billing Portal (カード変更・解約)
- **SUSPENDED**: 「再サブスクライブ」→ Stripe Checkout で再決済

#### テナント監査ログ (`/admin/audit-logs`)

自テナントの操作履歴を閲覧。フィルタ・ページネーション対応。

### 一般ユーザーの操作

#### 打刻 (`/dashboard`)

```
出勤 → (業務) → 休憩開始 → 休憩終了 → (業務) → 退勤
```

ボタンは状態に応じて有効/無効が切り替わります (ステートマシン制御)。
労働時間は `(退勤 - 出勤) - 休憩時間` で自動計算されます。

#### 日報

1. ダッシュボードの「日報を書く」から作成
2. ルート・対応件数・勤務時間・インシデント・備考・連絡事項を入力
3. 「下書き保存」で一時保存、「提出」で確定

#### 修正申請

1. 履歴一覧から「修正申請」をクリック
2. 修正したい時刻を入力 + 理由を記入して申請
3. ADMIN が承認すると勤怠データに自動反映

#### パスワードリセット

1. ログイン画面の「パスワードをお忘れですか？」をクリック
2. 会社 ID + メールアドレスを入力
3. リセットリンクがメールで届く (有効期限 1 時間)
4. リンクから新しいパスワードを設定

> メール送信には `RESEND_API_KEY` の設定が必要です。

### トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| ログインできない | 会社 ID / メール / パスワードが間違い | 3 項目全て確認。退社済み (active=false) ユーザーはログイン不可 |
| 「アカウントが停止されています」 | テナントが SUSPENDED | SA にプラン復帰を依頼 or `/admin/billing` で再サブスクライブ |
| パスワードリセットメールが届かない | `RESEND_API_KEY` 未設定 or メールドメイン未認証 | `.env` の設定を確認。Resend で送信元ドメインを認証 |
| Stripe 決済後もプランが TRIAL のまま | Webhook が届いていない | Stripe ダッシュボードの Webhooks ログを確認。`STRIPE_WEBHOOK_SECRET` を確認 |
| 打刻ボタンが押せない | 月が締め済み or 既にその状態 | 管理者に締め解除を依頼。or ステートマシンの順序を確認 |
| CSV が文字化けする | Excel の読み込み設定 | BOM 付き UTF-8 で出力されているので通常は問題なし。古い Excel では「データの取得」→「テキスト/CSV」を使用 |

---

## API リファレンス

### 認証

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| POST | `/api/register` | 新規会社登録 | 不要 |
| POST | `/api/auth/forgot-password` | パスワードリセット申請 | 不要 |
| POST | `/api/auth/reset-password` | パスワード変更 | 不要 |

### 勤怠

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| POST | `/api/time-entry/punch` | 打刻 (CLOCK_IN / BREAK_START / BREAK_END / CLOCK_OUT) | ログイン |
| GET/POST | `/api/daily-reports` | 日報の取得・作成/更新 | ログイン |
| POST | `/api/attendance-corrections` | 修正申請の作成 | ログイン |
| POST | `/api/attendance-corrections/decide` | 修正申請の承認・却下 | ADMIN |
| POST | `/api/close` | 月次締め | ADMIN |
| GET | `/api/admin/export` | CSV エクスポート | ADMIN |

### メンバー管理

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| POST | `/api/admin/members` | メンバー追加 | ADMIN |
| PATCH | `/api/admin/members` | 退社・復帰・ロール変更 | ADMIN |

### 課金 (Stripe)

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| POST | `/api/stripe/checkout` | Checkout Session 作成 | ADMIN |
| POST | `/api/stripe/webhook` | Webhook 受信 | Stripe 署名検証 |
| POST | `/api/stripe/portal` | Billing Portal Session 作成 | ADMIN |

### Super Admin

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| POST | `/api/super-admin/tenants/[id]/plan` | プラン変更 | SUPER_ADMIN |

> 全ての data-mutating API は SUSPENDED テナントからの呼び出しを `403` で拒否します。

---

## データベース

### モデル一覧 (14)

| モデル | 説明 |
|--------|------|
| `Tenant` | テナント (会社) + プラン + Stripe 連携 |
| `User` | ユーザー (テナント内でメール一意) |
| `PasswordResetToken` | パスワードリセットトークン (1 時間有効) |
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
| `Account` / `Session` / `VerificationToken` | NextAuth 用テーブル |

### マルチテナント

全てのデータは `tenantId` で分離されます。クエリには必ず `tenantId` フィルタが含まれ、テナント間のデータ漏洩を防止します。

---

## プロジェクト構成

```
workforce-app/
├── src/
│   ├── auth.ts                          NextAuth 設定 (JWT + Credentials)
│   ├── middleware.ts                    SUSPENDED プラン強制リダイレクト
│   ├── app/
│   │   ├── layout.tsx                   ルートレイアウト
│   │   ├── globals.css                  グローバルスタイル (ダークモード対応)
│   │   ├── Logo.tsx                     ブランドロゴコンポーネント
│   │   ├── login/                       ログイン
│   │   ├── register/                    新規会社登録
│   │   ├── forgot-password/             パスワードリセット申請
│   │   ├── reset-password/              パスワード再設定
│   │   ├── suspended/                   アカウント停止ページ
│   │   ├── dashboard/                   従業員ダッシュボード
│   │   ├── admin/                       テナント管理者画面
│   │   │   ├── members/                 メンバー管理
│   │   │   ├── billing/                 課金管理 (Stripe)
│   │   │   └── audit-logs/              監査ログ
│   │   ├── super-admin/                 Super Admin 画面
│   │   │   ├── tenants/[id]/            テナント詳細
│   │   │   └── audit-logs/              全テナント監査ログ
│   │   ├── daily-reports/new/           日報作成
│   │   ├── corrections/new/             修正申請作成
│   │   └── api/                         全 API ルート
│   ├── lib/
│   │   ├── db.ts                        Prisma シングルトン
│   │   ├── stripe.ts                    Stripe クライアント (lazy init)
│   │   ├── email.ts                     メール送信 (Resend)
│   │   ├── tenant-guard.ts             SUSPENDED テナント API ガード
│   │   ├── session.ts                   セッション型 & パーサー
│   │   ├── jst.ts                       JST タイムゾーン処理
│   │   ├── time.ts                      時刻ユーティリティ
│   │   ├── close.ts                     月次締め判定
│   │   └── csv.ts                       CSV 生成 (BOM 付き UTF-8)
│   └── generated/prisma/               Prisma 生成ファイル
├── prisma/
│   ├── schema.prisma                    スキーマ (14 モデル)
│   ├── seed.ts                          デモデータ
│   └── migrations/                      マイグレーション履歴
├── public/                              PWA アイコン・マニフェスト
├── .github/workflows/ci.yml            CI (lint / type-check / test / build)
└── .env.example                         環境変数テンプレート
```

---

## スクリプト一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー (port 3002) |
| `npm run build` | プロダクションビルド |
| `npm start` | プロダクションサーバー (port 3002) |
| `npm run lint` | ESLint |
| `npm test` | Vitest テスト実行 |
| `npm run test:watch` | テスト (watch モード) |
| `npm run prisma:generate` | Prisma クライアント生成 |
| `npm run prisma:migrate` | マイグレーション実行 |
| `npm run prisma:studio` | Prisma Studio (DB GUI) |
| `npm run db:seed` | デモデータ投入 |

---

## License

MIT
