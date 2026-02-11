# Workforce - 勤怠管理システム

マルチテナント対応の勤怠管理 Web アプリケーションです。
出退勤の打刻、勤怠履歴の確認、修正申請、月次締め処理を一元管理できます。

## 主な機能

| 機能 | 説明 |
|------|------|
| **打刻** | 出勤・休憩開始・休憩終了・退勤の4アクション |
| **勤務ステータス表示** | 「未出勤 / 勤務中 / 休憩中 / 退勤済み」をリアルタイム表示 |
| **勤怠履歴** | 直近7日間の出退勤時刻・労働時間を一覧表示 |
| **修正申請** | 打刻ミス時に理由を添えて修正を申請 |
| **承認ワークフロー** | 管理者・承認者が修正申請を承認/却下（確認ダイアログ付き） |
| **月次締め** | 管理者が月次の勤怠データをロック |
| **監査ログ** | 全操作（打刻・承認・締め）を `AuditLog` テーブルに自動記録 |
| **マルチテナント** | 会社ごとにデータを完全分離 |

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16 (App Router) |
| フロントエンド | React 19, TypeScript 5 |
| スタイリング | CSS Modules + デザイントークン (CSS変数) |
| データベース | PostgreSQL |
| ORM | Prisma 6 |
| 認証 | NextAuth v5 (JWT, Credentials Provider) |
| バリデーション | Zod |
| テスト | Vitest |
| CI/CD | GitHub Actions |

## セットアップ

### 前提条件

- Node.js 20 以上
- PostgreSQL 15 以上
- npm

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して以下を設定:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/workforce_app?schema=public"
AUTH_SECRET="32文字以上のランダムな文字列"
AUTH_URL="http://localhost:3000"
```

### 3. データベースのセットアップ

```bash
# Prisma クライアント生成
npm run prisma:generate

# マイグレーション実行
npm run prisma:migrate

# デモデータ投入（任意）
npm run db:seed
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスしてください。

### デモアカウント（seed実行後）

| 会社ID | メール | パスワード | 権限 |
|--------|--------|-----------|------|
| demo | admin@demo.local | password123 | 管理者 |

## npm スクリプト一覧

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint でコード検査 |
| `npm run typecheck` | TypeScript 型チェック |
| `npm test` | ユニットテスト実行 |
| `npm run test:watch` | テストをウォッチモードで実行 |
| `npm run prisma:generate` | Prisma クライアント生成 |
| `npm run prisma:migrate` | マイグレーション実行 |
| `npm run prisma:studio` | Prisma Studio（DB GUI）起動 |
| `npm run db:seed` | デモデータ投入 |

## プロジェクト構成

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API エンドポイント
│   │   ├── time-entry/punch/     # 打刻 API
│   │   ├── attendance-corrections/ # 修正申請 API
│   │   ├── close/                # 月次締め API
│   │   └── health/               # ヘルスチェック API
│   ├── dashboard/                # ダッシュボード
│   │   ├── page.tsx              # メインページ（Server Component）
│   │   ├── DashboardClient.tsx   # クライアント統合コンポーネント
│   │   ├── TimeClock.tsx         # 打刻ボタン
│   │   ├── History.tsx           # 勤怠履歴テーブル
│   │   ├── CorrectionsPanel.tsx  # 修正申請パネル
│   │   ├── ClosePanel.tsx        # 月次締めパネル
│   │   ├── Toast.tsx             # トースト通知
│   │   ├── ConfirmDialog.tsx     # 確認ダイアログ
│   │   └── dashboard.module.css  # スタイル
│   ├── corrections/new/          # 修正申請フォーム
│   ├── login/                    # ログインページ
│   └── globals.css               # グローバルスタイル・デザイントークン
├── lib/                          # ユーティリティ
│   ├── api.ts                    # API 共通処理（認証・エラーハンドリング）
│   ├── audit.ts                  # 監査ログ書き込み
│   ├── close.ts                  # 月次締めロジック
│   ├── constants.ts              # 定数・エラーメッセージ
│   ├── db.ts                     # Prisma クライアント
│   ├── jst.ts                    # JST タイムゾーン処理
│   ├── time.ts                   # 時刻フォーマット
│   ├── work-time.ts              # 労働時間計算
│   └── __tests__/                # ユニットテスト
├── types/
│   └── next-auth.d.ts            # NextAuth 型拡張
└── auth.ts                       # NextAuth 設定
```

## API エンドポイント

### `POST /api/time-entry/punch`

打刻を記録します。

```json
{ "action": "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT" }
```

### `POST /api/attendance-corrections`

修正申請を作成します。

```json
{ "date": "2026-02-09", "reason": "打刻忘れのため" }
```

### `POST /api/attendance-corrections/decide`

修正申請を承認/却下します（管理者・承認者のみ）。

```json
{ "id": "correction_id", "decision": "APPROVED" | "REJECTED" }
```

### `POST /api/close`

月次締めを実行します（管理者のみ）。

```json
{ "month": "2026-02" }
```

### `GET /api/health`

システムのヘルスチェック。データベース接続を確認します。

```json
{ "status": "ok", "timestamp": "...", "database": "connected" }
```

## ユーザーロール

| ロール | 権限 |
|--------|------|
| **EMPLOYEE** | 打刻、自分の履歴閲覧、修正申請の提出 |
| **APPROVER** | EMPLOYEE の全権限 + 修正申請の承認/却下 |
| **ADMIN** | APPROVER の全権限 + 月次締め処理 |

## 設計方針

### マルチテナント

全てのデータベースクエリに `tenantId` を含め、テナント間のデータを完全に分離しています。ログイン時に会社ID（tenant slug）で所属テナントを特定します。

### タイムゾーン

業務時間は日本標準時（JST / Asia/Tokyo）を基準にしています。日付の計算は `startOfJstDay()` でJST午前0時をUTCに変換して処理します。

### 型安全

NextAuth のセッション・JWT トークンに独自フィールド（`tenantId`, `role`, `departmentId`）を型安全に拡張しています。`as any` は使用していません。

### 監査ログ

打刻・修正申請・承認・月次締めの全操作を `AuditLog` テーブルに記録しています。変更前後のデータを JSON で保存します。

## ヘルスチェック

本番環境での監視に `/api/health` エンドポイントを使用してください。

```bash
curl http://localhost:3000/api/health
```

## CI/CD

GitHub Actions で以下を自動実行します:

1. **Lint** - ESLint によるコード品質チェック
2. **Type Check** - TypeScript の型チェック
3. **Unit Tests** - Vitest によるテスト
4. **Build** - Next.js ビルド検証

## 本番デプロイ（Vercel + Neon）

推奨構成: **Vercel**（アプリ）+ **Neon**（PostgreSQL）
50人規模の勤怠管理なら無料枠で運用可能です。

### 1. Neon でデータベースを作成

1. [Neon Console](https://console.neon.tech) にログイン
2. 新しいプロジェクトを作成（リージョン: `ap-southeast-1` など）
3. ダッシュボードから接続文字列をコピー

接続文字列の形式:

```
postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

> **注意**: `channel_binding=require` が含まれている場合は削除してください。Prisma との互換性の問題があります。

### 2. データベースのセットアップ

セットアップスクリプトを使うと、マイグレーション + デモデータ投入が一発で完了します。

```bash
# ワンステップセットアップ
./scripts/setup-neon.sh "postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
```

または手動で実行:

```bash
# 接続文字列を変数に設定
export DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"

# Prisma クライアント生成
npx prisma generate

# マイグレーション実行（テーブル作成）
npx prisma migrate deploy

# デモデータ投入（任意）
npx tsx prisma/seed.ts
```

完了後のデモアカウント:

| 会社ID | メール | パスワード | 権限 |
|--------|--------|-----------|------|
| demo | admin@demo.local | password123 | 管理者 |

### 3. Vercel にデプロイ

1. [Vercel](https://vercel.com) でこのリポジトリをインポート
2. 環境変数を設定:

| 変数 | 値 | 説明 |
|------|-----|------|
| `DATABASE_URL` | Neon の接続文字列 | ステップ1でコピーしたもの |
| `AUTH_SECRET` | ランダム文字列 | `npx auth secret` で生成 |

3. デプロイを実行
   - `postinstall` で Prisma クライアントが自動生成されます
   - 本番環境では Neon の WebSocket アダプターで接続します（サーバーレス対応）

### 4. デプロイ後の確認

```bash
# ヘルスチェック
curl https://your-app.vercel.app/api/health

# 期待されるレスポンス
# {"status":"ok","timestamp":"...","database":"connected"}
```

### アーキテクチャ

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

### コスト目安

| 規模 | Vercel | Neon | 月額合計 |
|------|--------|------|----------|
| 個人・検証 | Hobby（無料） | Free | **$0** |
| ~50人 | Pro（$20） | Free | **$20** |
| ~200人 | Pro（$20） | Launch（$19） | **$39** |

## ライセンス

Private
