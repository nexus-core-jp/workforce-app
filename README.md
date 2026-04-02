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
9. [信頼性・安全対策](#信頼性安全対策)
10. [API リファレンス](#api-リファレンス)
11. [データベース](#データベース)
12. [プロジェクト構成](#プロジェクト構成)
13. [スクリプト一覧](#スクリプト一覧)

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
| 従業員 (EMPLOYEE) | `demo` | `tanaka@demo.local` | `password123` | `/dashboard` |

> - パスワードは環境変数 `SEED_DEMO_PASSWORD` / `SEED_SUPER_PASSWORD` で変更可能です。
> - デモテナントは **ACTIVE プラン** で作成されるため、トライアル期限切れは発生しません。
> - Stripe / Resend は任意です。`.env` の `STRIPE_*` / `RESEND_*` を空のままにすればスキップされます。

---

## 本番デプロイ

### 方法 1: Vercel + Neon (推奨)

最も簡単な構成です。どちらも無料プランがあります。
50人規模の勤怠管理なら無料枠で運用可能です。

#### アーキテクチャ

```
[ブラウザ] ──→ [Vercel Edge Network]
                    │
            [Next.js App (サーバーレス関数)]
                    │
            [Neon WebSocket Adapter]
                    │
            [Neon PostgreSQL (サーバーレス)]
```

- **Vercel**: アクセスがないときはサーバーレス関数がスリープ → コスト0
- **Neon**: アクセスがないときは DB がスケールダウン → コスト最小化
- 勤怠アプリは朝・夕方のピーク以外はほぼアイドル → 無料枠で十分

#### コスト目安

| 規模 | Vercel | Neon | 月額合計 |
|------|--------|------|----------|
| 個人・検証 | Hobby（無料） | Free | **$0** |
| ~50人 | Pro（$20） | Free | **$20** |
| ~200人 | Pro（$20） | Launch（$19） | **$39** |

#### Step 1: Neon でデータベースを作成

1. [neon.tech](https://neon.tech) でアカウント作成
2. 新しいプロジェクトを作成 (リージョン: `ap-southeast-1` 推奨)
3. 接続文字列をコピー:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

> **注意**: `channel_binding=require` が含まれている場合は削除してください。Prisma との互換性の問題があります。

#### Step 2: Vercel にデプロイ

1. [vercel.com](https://vercel.com) でリポジトリをインポート
2. **Environment Variables** に以下を設定:

   | 変数 | 値 | 備考 |
   |------|-----|------|
   | `DATABASE_URL` | Neon の接続文字列 | テンプレートのままだとビルドが失敗します |
   | `AUTH_SECRET` | `openssl rand -base64 32` で生成した文字列 | 32文字未満だとビルドが失敗します |
   | `AUTH_URL` | Vercel のデプロイ URL (例: `https://your-app.vercel.app`) | |
   | `CRON_SECRET` | Vercel Settings > Cron Jobs で確認 | ヘルスチェック Cron 用 |
   | `SLACK_ALERT_WEBHOOK_URL` | Slack Incoming Webhook URL | 任意: 障害時の通知先 |

3. **Deploy** をクリック

> Build Command はデフォルトのまま。`postinstall` で `prisma generate` が自動実行されます。

#### Step 3: DB マイグレーション & シード

セットアップスクリプトを使うと、マイグレーション + デモデータ投入が一発で完了します。

```bash
# ワンステップセットアップ
./scripts/setup-neon.sh "postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
```

または手動で実行:

```bash
# .env の DATABASE_URL を Neon の接続文字列に設定した状態で:
npx prisma migrate deploy
npm run db:seed
```

これで本番環境にテーブルとデモデータが作成されます。

#### Step 4: デプロイ後の確認

```bash
# ヘルスチェック
curl https://your-app.vercel.app/api/health

# 期待されるレスポンス
# {"status":"ok","timestamp":"...","checks":{"database":"ok","tenants":"ok","auth_secret":"ok"}}
```

> ビルド時に `scripts/check-db.ts` が自動実行され、DB接続不可やテンプレートのままの `DATABASE_URL` を検出するとデプロイが中止されます。

#### Step 5 (任意): カスタムドメイン

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
| `LINE_CLIENT_ID` | 任意 | LINE Login クライアント ID | |
| `LINE_CLIENT_SECRET` | 任意 | LINE Login クライアントシークレット | |
| `LINE_CHANNEL_SECRET` | 任意 | LINE Bot チャネルシークレット | |
| `LINE_CHANNEL_ACCESS_TOKEN` | 任意 | LINE Bot チャネルアクセストークン | |
| `LINE_NOTIFY_TOKEN` | 任意 | LINE Notify トークン | |
| `CRON_SECRET` | 任意 | Vercel Cron ジョブの認証シークレット | Vercel が自動生成 |
| `SLACK_ALERT_WEBHOOK_URL` | 任意 | ヘルスチェック失敗時の Slack 通知先 | `https://hooks.slack.com/...` |
| `SEED_DEMO_PASSWORD` | 任意 | シード時のデモアカウントパスワード (未設定: `password123`) | |
| `SEED_SUPER_PASSWORD` | 任意 | シード時の SA パスワード (未設定: `superadmin123`) | |

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

#### ログインに関する問題

| 症状 | 原因 | 対処法 |
|------|------|--------|
| ログインできない (全ユーザー) | `DATABASE_URL` が未設定またはテンプレートのまま | `.env` を確認。`npm run db:check` でDB接続をテスト |
| ログインできない (全ユーザー) | DBにデモデータが未投入 | `npm run db:seed` を実行 |
| ログインできない (特定ユーザー) | 会社 ID / メール / パスワードが間違い | 3 項目全て確認。会社IDは大文字小文字を区別します |
| ログインできない (特定ユーザー) | ユーザーが退社済み (`active=false`) | SA または ADMIN がメンバー管理から「復帰」操作 |
| 「サーバーに一時的な問題が発生しています」 | DB接続エラー | `npm run db:check` で接続を確認。Neon の場合はコンソールでDB状態を確認 |
| 「ログイン試行回数が上限を超えました」 | レート制限 (10回/15分) | 15分待つ。または DB の `RateLimitEntry` テーブルの該当レコードを削除 |
| ログイン後すぐ `/suspended` に飛ばされる | テナントが SUSPENDED | SA にプラン復帰を依頼 or `/admin/billing` で再サブスクライブ |
| ログイン後すぐ `/suspended` に飛ばされる | トライアル期限切れ | SA がプランを ACTIVE に変更 or Stripe で決済 |
| 2FA コード入力画面が出る | TOTP が有効化されている | 認証アプリ (Google Authenticator 等) のコードを入力 |

#### デプロイ・運用に関する問題

| 症状 | 原因 | 対処法 |
|------|------|--------|
| Vercel ビルドが失敗する | `DATABASE_URL` がテンプレートのまま | Vercel Environment Variables で正しい接続文字列を設定 |
| Vercel ビルドが失敗する | DB に接続できない | Neon コンソールでDBが起動しているか確認。IP 制限がある場合は Vercel の IP を許可 |
| `/api/health` が 503 を返す | DB接続 or AUTH_SECRET の問題 | レスポンスの `checks` と `errors` フィールドで詳細を確認 |
| パスワードリセットメールが届かない | `RESEND_API_KEY` 未設定 or メールドメイン未認証 | `.env` の設定を確認。Resend で送信元ドメインを認証 |
| Stripe 決済後もプランが TRIAL のまま | Webhook が届いていない | Stripe ダッシュボードの Webhooks ログを確認。`STRIPE_WEBHOOK_SECRET` を確認 |
| 打刻ボタンが押せない | 月が締め済み or 既にその状態 | 管理者に締め解除を依頼。or ステートマシンの順序を確認 |
| CSV が文字化けする | Excel の読み込み設定 | BOM 付き UTF-8 で出力されているので通常は問題なし。古い Excel では「データの取得」→「テキスト/CSV」を使用 |

---

## 信頼性・安全対策

本アプリでは「ログインできない」「サービスが使えない」を防ぐため、複数レイヤーで安全対策を実装しています。

### 1. ビルド時バリデーション (デプロイゲート)

**壊れた設定のままデプロイされることを防止します。**

| チェック | ファイル | タイミング |
|---------|---------|-----------|
| `DATABASE_URL` がテンプレートのままでないか | `src/lib/env.ts` | アプリ起動時 |
| `DATABASE_URL` が `postgresql://` で始まるか | `src/lib/env.ts` | アプリ起動時 |
| `AUTH_SECRET` が 32 文字以上あるか | `src/lib/env.ts` + `src/auth.ts` | アプリ起動時 |
| DB に実際に接続できるか | `scripts/check-db.ts` | Vercel ビルド時 |
| テナントデータが存在するか | `scripts/check-db.ts` | Vercel ビルド時 |

> DB 接続チェックはビルドコマンドに組み込まれており (`vercel.json`)、失敗するとデプロイが中止されます。

### 2. 定期ヘルスチェック (Vercel Cron)

**デプロイ後の障害を10分以内に検知します。**

- **エンドポイント**: `GET /api/cron/health` (10分間隔)
- **チェック項目**: DB接続 / テナント存在 / AUTH_SECRET 設定 / トライアル期限切れの検知
- **障害通知**: `SLACK_ALERT_WEBHOOK_URL` 設定時に Slack へ自動通知
- **手動確認**: `GET /api/health` で DB・テナント・AUTH の 3 項目を即座に確認可能

### 3. ログインエラーの分類

**ユーザーが適切に対処できるよう、エラーを区別します。**

| エラー | 原因 | ユーザーへの表示 |
|--------|------|-----------------|
| 認証失敗 | 会社ID / メール / パスワードの誤り | 「会社ID、メールアドレス、またはパスワードが正しくありません」 |
| サービス障害 | DB接続エラー | 「サーバーに一時的な問題が発生しています」 |
| レート制限 | 10回/15分を超過 | 「ログイン試行回数が上限を超えました。15分後にお試しください」 |
| 2FA 要求 | TOTP が有効 | 認証コード入力フィールドを表示 |
| 2FA 不正 | コード間違い | 「認証コードが正しくありません」 |

### 4. テナントプラン保護

**SUSPENDED またはトライアル期限切れのテナントは、ページ表示 (`proxy.ts`) と API 呼び出し (`tenant-guard.ts`) の両方でブロックされます。**

- proxy ミドルウェア: ログイン後のページ遷移時に `/suspended` へリダイレクト
- API ガード: データ変更 API で `403` を返却
- JWT リフレッシュ: プランと `trialEndsAt` を毎リクエストで DB から再取得し、SA の変更を即時反映
- Cron 監視: トライアル期限が 7 日以内 / 期限切れのテナントを検知して Slack 通知

### 5. seed のべき等性

**`npm run db:seed` は何度実行しても安全です (upsert)。**

- デフォルトパスワード: `password123` (デモ) / `superadmin123` (SA)
- 環境変数 `SEED_DEMO_PASSWORD` / `SEED_SUPER_PASSWORD` で上書き可能
- デモテナントは **ACTIVE プラン** で作成されるため、トライアル期限切れは発生しません
- 本番環境 (`NODE_ENV=production`) では実行が拒否されます

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

### ユーザー

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| GET/POST | `/api/users` | ユーザー一覧/作成 | ログイン |
| POST | `/api/users/change-password` | パスワード変更 | ログイン |

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

### ヘルスチェック・監視

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| GET | `/api/health` | ヘルスチェック (DB接続 + テナント存在 + AUTH設定) | 不要 |
| GET | `/api/cron/health` | 定期ヘルスチェック (10分間隔, Vercel Cron) | `CRON_SECRET` |

> 全ての data-mutating API は SUSPENDED またはトライアル期限切れテナントからの呼び出しを `403` で拒否します。

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
| `npm run typecheck` | 型チェック |
| `npm test` | Vitest テスト実行 |
| `npm run test:watch` | テスト (watch モード) |
| `npm run prisma:generate` | Prisma クライアント生成 |
| `npm run prisma:migrate` | マイグレーション実行 |
| `npm run prisma:studio` | Prisma Studio (DB GUI) |
| `npm run db:check` | DB 接続 & テナント存在チェック |
| `npm run db:seed` | デモデータ投入 |

---

## License

MIT
