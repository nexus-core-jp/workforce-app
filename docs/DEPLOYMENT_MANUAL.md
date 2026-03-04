# Workforce Nexus 運用・デプロイマニュアル

**最終更新日**: 2026年3月2日
**対象バージョン**: workforce-app `main` ブランチ

---

## 1. 概要

本ドキュメントは、マルチテナント勤怠管理SaaS「**Workforce Nexus**」を Vercel 本番環境でリリース・運用するための手順書です。初回セットアップから日常運用、トラブルシューティングまでを網羅しています。

### 1.1 技術スタック

| カテゴリ | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js (App Router) | 16.1.6 |
| 認証 | NextAuth v5 (JWT戦略) | beta.30 |
| データベース | PostgreSQL (Neon Serverless) | — |
| ORM | Prisma ORM + `@prisma/adapter-neon` | 6.19.2 |
| LINE連携 | LINE Login (OAuth 2.1 / OIDC) | — |
| 決済 (予定) | Stripe | — |
| ホスティング | Vercel | — |

### 1.2 本番環境情報

| 項目 | 値 |
|---|---|
| Vercelプロジェクト | `nexus-core-jps-projects/workforce-app` |
| 本番URL | `https://workforce-app-two.vercel.app` |
| GitHubリポジトリ | `nexus-core-jp/workforce-app` |
| デプロイブランチ | `main` |
| データベース | Neon PostgreSQL (ap-southeast-1) |
| LINEチャネルID | `2009280392` |

---

## 2. 環境変数

Vercelプロジェクトの **Settings > Environment Variables** に、以下の環境変数を設定する必要があります。全ての環境変数は **Production**, **Preview**, **Development** の3環境に適用されます。

### 2.1 必須環境変数

| 変数名 | 説明 | 設定方法 |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQLの **Pooling** 接続文字列。`sslmode=require` を含むこと。 | Neonダッシュボードの Connection Details からコピー |
| `AUTH_SECRET` | NextAuth v5のセッション署名鍵。**32文字以上**のランダム文字列。 | `openssl rand -base64 32` で生成 |
| `AUTH_URL` | 本番環境のベースURL。末尾にスラッシュを付けない。 | `https://workforce-app-two.vercel.app` |
| `NEXT_PUBLIC_AUTH_TRUST_HOST` | 認証で信頼するホスト名。 | `workforce-app-two.vercel.app` |
| `LINE_CHANNEL_ID` | LINE Loginチャネルの「チャネルID」。 | LINE Developers Console から取得 |
| `LINE_CHANNEL_SECRET` | LINE Loginチャネルの「チャネルシークレット」。**32文字**であることを確認。 | LINE Developers Console から取得 |

### 2.2 オプション環境変数（今後設定予定）

| 変数名 | 説明 | 設定方法 |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe決済のAPIシークレットキー。 | Stripeダッシュボードから取得 |
| `RESEND_API_KEY` | メール通知サービス Resend のAPIキー。 | Resendダッシュボードから取得 |

> **重要**: `LINE_CHANNEL_SECRET` や `AUTH_SECRET` などの機密情報は、Vercelの環境変数設定画面で「Sensitive」オプションを有効にして保護してください。

---

## 3. 初回セットアップ手順

新しい環境にゼロからデプロイする場合の手順です。既に本番環境が稼働中の場合は、第4章「日常運用」に進んでください。

### 3.1 Neon PostgreSQL データベースの作成

1. [Neon Console](https://console.neon.tech/) にログインします。
2. 「New Project」からプロジェクトを作成します。リージョンは **Asia Pacific (Singapore)** を推奨します。
3. 作成後、「Connection Details」から **Pooling** 接続文字列をコピーします。この文字列が `DATABASE_URL` になります。

### 3.2 Vercel プロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard) にログインします。
2. 「Add New > Project」をクリックし、GitHubリポジトリ `nexus-core-jp/workforce-app` をインポートします。
3. フレームワークは **Next.js** が自動検出されます。
4. 「Environment Variables」セクションで、第2章の環境変数を全て設定します。
5. 「Deploy」をクリックしてデプロイを開始します。

### 3.3 データベースマイグレーション

Vercelデプロイが成功した後、データベースのテーブルを作成する必要があります。ローカル環境で以下のコマンドを実行してください。

```bash
# リポジトリをクローン
git clone https://github.com/nexus-core-jp/workforce-app.git
cd workforce-app

# 依存パッケージをインストール
npm install

# .envファイルにDATABASE_URLを設定
echo 'DATABASE_URL="postgres://user:password@host/dbname?sslmode=require"' > .env

# Prismaクライアントを生成
npx prisma generate

# マイグレーションを本番DBに適用
npx prisma migrate deploy
```

> **注意**: 本番データベースに対して `prisma migrate dev` を実行しないでください。`prisma migrate deploy` は既存のマイグレーションファイルのみを適用し、スキーマの変更は行いません。

### 3.4 LINE Developers Console の設定

1. [LINE Developers Console](https://developers.line.biz/console/) にログインします。
2. プロバイダー「nexus-core-jp」内のチャネル「Workforce Nexus」を開きます。
3. 「**LINEログイン設定**」タブで、以下のコールバックURLを設定します。

| コールバックURL |
|---|
| `https://workforce-app-two.vercel.app/api/auth/callback/line` |
| `https://workforce-app-two.vercel.app/api/line/callback` |

4. 「**チャネル基本設定**」タブで以下を確認します。

| 設定項目 | 必要な状態 |
|---|---|
| アプリタイプ | 「ウェブアプリ」にチェック |
| チャネルステータス | 「**公開済み**」 |

> **注意**: チャネルステータスが「開発中」のままだと、LINE Developers Consoleに登録された開発者アカウント以外のユーザーはLINEログインを利用できません。公開は不可逆操作であり、「開発中」に戻すにはチャネルを削除して再作成する必要があります。

### 3.5 動作確認

デプロイ完了後、以下のエンドポイントで動作を確認します。

| 確認項目 | URL | 期待される結果 |
|---|---|---|
| ヘルスチェック | `/api/health` | `{"status":"ok","database":"connected"}` |
| 新規会社登録 | `/register` | フォーム入力後、`/login?registered=true` にリダイレクト |
| ログイン | `/login` | 会社ID + メール + パスワードでログイン後、`/dashboard` に遷移 |
| LINEログイン | `/login` → 「LINEでログイン」ボタン | LINE認証画面 → ダッシュボードに遷移 |
| ダッシュボード | `/dashboard` | 打刻・日報・勤怠履歴が表示される |

---

## 4. 日常運用

### 4.1 コードの更新とデプロイ

Workforce Nexusは **GitOps** モデルを採用しています。`main` ブランチへのpushが自動的に本番デプロイをトリガーします。

通常の開発フローは以下のとおりです。

1. フィーチャーブランチで開発を行います。
2. GitHub上でPull Requestを作成します。VercelがPreview Deploymentを自動生成するため、レビュー時にPreview URLで動作確認が可能です。
3. レビュー完了後、`main` ブランチにマージします。Vercelが自動的にProduction Deploymentを実行します。

### 4.2 手動Redeploy

環境変数を変更した場合や、キャッシュの問題が疑われる場合は、Vercelダッシュボードから手動でRedeployを実行できます。

1. [Vercel Deployments](https://vercel.com/nexus-core-jps-projects/workforce-app/deployments) にアクセスします。
2. 最新のProduction Deploymentの「...」メニューから「Redeploy」を選択します。
3. 「Use existing Build Cache」のチェックを外すと、クリーンビルドが実行されます。

### 4.3 データベーススキーマの変更

Prismaスキーマ（`prisma/schema.prisma`）に変更を加えた場合、以下の手順でマイグレーションを適用します。

```bash
# 1. ローカルでマイグレーションファイルを作成
npx prisma migrate dev --name <変更内容の説明>

# 2. GitHubにpush（Vercelデプロイがトリガーされる）
git add -A && git commit -m "db: <変更内容>" && git push

# 3. 本番DBにマイグレーションを適用
# (.envにDATABASE_URLが設定されていること)
npx prisma migrate deploy
```

> **重要**: 手順2（Vercelデプロイ）と手順3（DBマイグレーション）の順序に注意してください。新しいカラムを追加する場合は、**先にDBマイグレーションを適用**してからVercelデプロイを行うと、ダウンタイムを最小化できます。

### 4.4 ヘルスチェック

本番環境の稼働状態は、以下のコマンドで確認できます。

```bash
curl -s https://workforce-app-two.vercel.app/api/health | jq .
```

正常時のレスポンスは以下のとおりです。

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-02T..."
}
```

`database` が `"disconnected"` の場合は、Neonダッシュボードでデータベースの状態を確認してください。

### 4.5 カスタムドメインの設定

カスタムドメインを取得した場合、以下の手順で設定します。

1. Vercelダッシュボードの **Settings > Domains** にアクセスします。
2. 取得したドメイン名を入力して「Add」をクリックします。
3. 表示されるDNSレコード（CNAME または A レコード）を、ドメインレジストラのDNS設定に追加します。
4. DNS伝播後（通常数分〜数時間）、Vercelが自動的にSSL証明書を発行します。
5. 環境変数 `AUTH_URL` と `NEXT_PUBLIC_AUTH_TRUST_HOST` を新しいドメインに更新します。
6. LINE Developers ConsoleのコールバックURLも新しいドメインに更新します。
7. Redeployを実行します。

---

## 5. トラブルシューティング

### 5.1 DB接続エラー（`database: disconnected`）

ヘルスチェックで `database: disconnected` が返される場合、以下の原因が考えられます。

| 原因 | 確認方法 | 対処 |
|---|---|---|
| `DATABASE_URL` の設定ミス | Vercel環境変数を確認 | 正しい接続文字列に修正し、Redeploy |
| Neon DBの停止・休止 | Neonダッシュボードで確認 | プロジェクトを再起動 |
| `@prisma/adapter-neon` のバージョン不整合 | `package.json` を確認 | `@prisma/client` と同じバージョンに統一 |

### 5.2 LINE認証エラー

LINE認証に関するエラーは、主に以下の3つのパターンがあります。

| エラー | 原因 | 対処 |
|---|---|---|
| `Configuration Error` | `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` の設定ミス | Vercel環境変数を確認。特に `LINE_CHANNEL_SECRET` が32文字であること |
| `invalid_redirect_uri` | コールバックURLの不一致 | LINE Developers ConsoleのコールバックURLを確認 |
| LINEログインボタンが反応しない | チャネルステータスが「開発中」 | チャネルを「公開済み」に変更 |

### 5.3 ビルドエラー

Vercelのビルドが失敗する場合、以下を確認してください。

| エラー | 原因 | 対処 |
|---|---|---|
| TypeScriptコンパイルエラー | コードの型エラー | `npx tsc --noEmit` をローカルで実行して修正 |
| Prisma Client生成エラー | `prisma generate` の失敗 | `package.json` の `build` スクリプトに `prisma generate` が含まれていることを確認 |
| 依存パッケージエラー | `node_modules` の不整合 | `npm ci` でクリーンインストール |

### 5.4 ログの確認方法

Vercelのランタイムログは、以下のURLで確認できます。

> [https://vercel.com/nexus-core-jps-projects/workforce-app/logs](https://vercel.com/nexus-core-jps-projects/workforce-app/logs)

ログはリアルタイムで表示され、APIルートのエラーやサーバーサイドの例外を確認できます。フィルター機能を使って、特定のパス（例: `/api/auth`）やステータスコード（例: `500`）で絞り込むことが可能です。

---

## 6. セキュリティに関する注意事項

本番環境の運用にあたり、以下のセキュリティ上の注意事項を遵守してください。

`AUTH_SECRET`、`LINE_CHANNEL_SECRET`、`DATABASE_URL` などの機密情報は、GitHubリポジトリにコミットしないでください。これらは必ずVercelの環境変数として管理します。`.env` ファイルは `.gitignore` に含まれていますが、誤ってコミットしないよう注意が必要です。

`npm run db:seed` は本番環境では実行しないでください。`NODE_ENV=production` の場合は自動的にブロックされますが、ローカルから本番DBに対して実行しないよう注意してください。

定期的に `AUTH_SECRET` をローテーションすることを推奨します。変更後はRedeployが必要です。なお、既存のセッションは無効化されるため、全ユーザーが再ログインする必要があります。

---

## 7. 参考リンク

| サービス | URL |
|---|---|
| Vercelダッシュボード | [https://vercel.com/nexus-core-jps-projects/workforce-app](https://vercel.com/nexus-core-jps-projects/workforce-app) |
| Neonダッシュボード | [https://console.neon.tech/](https://console.neon.tech/) |
| LINE Developers Console | [https://developers.line.biz/console/](https://developers.line.biz/console/) |
| GitHubリポジトリ | [https://github.com/nexus-core-jp/workforce-app](https://github.com/nexus-core-jp/workforce-app) |
| Prisma公式ドキュメント | [https://www.prisma.io/docs](https://www.prisma.io/docs) |
| NextAuth v5ドキュメント | [https://authjs.dev/](https://authjs.dev/) |


---

## 8. Stripe決済連携

Workforce NexusはStripeと連携して、サブスクリプション決済を管理します。以下に設定手順を記載します。

### 8.1. Stripe商品・価格の作成

1. [Stripeダッシュボード](https://dashboard.stripe.com/)にログインします。
2. 「商品カタログ」に移動し、「**+ 商品を追加**」をクリックします。
3. **商品情報**を入力します。
   - **名前**: Workforce Nexus Pro Plan
   - **説明**: 勤怠管理SaaSのプロフェッショナルプラン
4. **料金体系**を設定します。
   - **モデル**: 「標準の料金体系」を選択
   - **価格**: 任意の月額料金を設定（例: 5,000円）
   - **継続**: 「継続」を選択
   - **請求期間**: 「月ごと」を選択
5. 商品を保存すると、**価格ID**（`price_...`）が発行されます。このIDをVercelの環境変数 `STRIPE_PRICE_ID` に設定します。

### 8.2. APIキーとWebhookシークレットの取得

1. 「開発者」 > 「**APIキー**」に移動します。
2. 「**シークレットキー**」をコピーし、Vercelの環境変数 `STRIPE_SECRET_KEY` に設定します。
3. 「開発者」 > 「**Webhook**」に移動し、「**+ エンドポイントを追加**」をクリックします。
4. **エンドポイントURL**に `https://workforce-app-two.vercel.app/api/stripe/webhook` を設定します。
5. 「**リッスンするイベント**」で以下のイベントを選択します。
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. エンドポイントを作成すると、「**署名シークレット**」が表示されます。これをVercelの環境変数 `STRIPE_WEBHOOK_SECRET` に設定します。

### 8.3. Vercel環境変数の設定

以下の3つの環境変数をVercelに追加し、Redeployを実行します。

| 変数名 | 説明 | 設定例 |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe APIシークレットキー | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook署名シークレット | `whsec_...` |
| `STRIPE_PRICE_ID` | サブスクリプションの価格ID | `price_...` |

### 8.4. 動作確認

1. 管理者アカウントでログインし、「管理画面」 > 「プラン・請求」にアクセスします。
2. 「有料プランにアップグレード」ボタンをクリックし、Stripe Checkout画面に遷移することを確認します。
3. （テストカードを使用して）決済を完了し、プランが「アクティブ」に更新されることを確認します。
4. 「支払い管理（Stripe）」ボタンをクリックし、Stripe Billing Portalに遷移することを確認します。


---

## 9. Resendメール通知

パスワードリセットや新規登録通知のために、Resendと連携してメールを送信します。

### 9.1. ドメイン認証

Resendからメールを送信するには、送信元として使用するドメインを認証する必要があります。Workforce Nexusでは `noreply@workforce.app` を使用するため、`workforce.app` ドメインの認証が必要です。

1. [Resendダッシュボード](https://resend.com/domains)にログインします。
2. 「**Add Domain**」をクリックし、`workforce.app` を入力します。
3. 表示される2つのDNSレコード（`SPF` と `DKIM`）を、`workforce.app` のDNSプロバイダー（例: Google Domains, Cloudflare）に追加します。
4. DNSが伝播した後、Resendダッシュボードで「Verify」をクリックして認証を完了します。

### 9.2. APIキーの取得

1. 「API Keys」に移動し、「**+ Create API Key**」をクリックします。
2. キーに名前を付け（例: `Workforce Nexus Production`）、権限は「**Full access**」を選択します。
3. 作成されたAPIキーをコピーし、Vercelの環境変数 `RESEND_API_KEY` に設定します。

### 9.3. Vercel環境変数の設定

以下の2つの環境変数をVercelに追加し、Redeployを実行します。

| 変数名 | 説明 | 設定例 |
|---|---|---|
| `RESEND_API_KEY` | ResendのAPIキー | `re_...` |
| `NOTIFICATION_EMAIL` | 新規登録通知を受け取るメールアドレス | `your-admin-email@example.com` |

### 9.4. 動作確認

1. ログイン画面で「パスワードをお忘れですか？」からパスワードリセットを試行し、メールが届くことを確認します。
2. 新しい会社を登録し、`NOTIFICATION_EMAIL` に設定したアドレスに通知メールが届くことを確認します。
