# リリース準備 監査レポート

> 監査日: 2026-02-16
> 対象: workforce-app v0.1.0 (commit d1bb3d4)

---

## 1. 現状サマリー

MVP段階のマルチテナント勤怠管理アプリ。以下が実装済み:

| 機能 | 状態 | 備考 |
|------|------|------|
| 認証 (email/password) | 実装済 | next-auth 5 beta (JWT) |
| マルチテナント | 実装済 | tenantId スコープ一貫 |
| 打刻 (出勤/休憩/退勤) | 実装済 | 1日1回休憩制限 |
| 直近7日履歴 | 実装済 | |
| 打刻修正申請 | 一部実装 | 理由のみ、時刻入力UI未実装 |
| 修正承認/却下 | 一部実装 | 承認してもTimeEntry未反映 |
| 月次締め | 実装済 | COMPANY スコープのみ |
| 日報 (DailyReport) | スキーマのみ | API/UI未実装 |
| 休暇申請 (LeaveRequest) | スキーマのみ | API/UI未実装 |
| 休暇残高 (LeaveLedger) | スキーマのみ | API/UI未実装 |
| シフト管理 | スキーマのみ | API/UI未実装 |
| 部署管理 | スキーマのみ | 管理UI未実装 |
| ユーザー管理 | スキーマのみ | 管理UI未実装 |
| 監査ログ (AuditLog) | スキーマのみ | 書き込み処理未実装 |

**技術スタック**: Next.js 16.1.6 / React 19.2.3 / TypeScript 5 / Prisma 6.19 / PostgreSQL / next-auth 5.0.0-beta.30 / Zod 4 / bcryptjs

---

## 2. ビルド・品質の現状

### 2.1 ビルドエラー

| 問題 | 詳細 | 深刻度 |
|------|------|--------|
| Google Fonts 取得失敗 | `layout.tsx` で `next/font/google` を使用。オフライン/CI環境でビルド失敗する | **高** |
| メタデータ未変更 | `title: "Create Next App"` のまま | 低 |

### 2.2 TypeScript エラー (2件)

```
prisma.config.ts(12,5): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/app/login/page.tsx(32,22): error TS2339: Property 'error' does not exist on type 'never'.
```

### 2.3 ESLint エラー (25件、generated除く)

- `@typescript-eslint/no-explicit-any`: 25箇所
- 主に `src/auth.ts`、`dashboard/page.tsx`、各APIルートで `session.user as any` を多用

### 2.4 テスト

- **テストファイル: 0件**
- テストフレームワーク未導入 (Jest/Vitest/Playwright なし)
- CI/CDパイプライン未設定

---

## 3. クリティカル問題 (リリース前に必須)

### P0: ビルドが通らない

1. **Google Fonts をローカルフォントに変更** (`layout.tsx`)
   - `next/font/google` → `next/font/local` またはシステムフォントに変更
   - CI/オフライン環境でビルドが失敗する根本原因

2. **TypeScript エラー修正** (2件)
   - `prisma.config.ts`: `process.env.DATABASE_URL` に `!` アサーションまたはデフォルト値
   - `login/page.tsx`: `signIn` の戻り値型の処理

### P0: セキュリティ

3. **レート制限なし**
   - ログインAPI、全APIエンドポイントにレート制限がない
   - ブルートフォース攻撃に対して脆弱

4. **自己承認が可能**
   - `attendance-corrections/decide` で申請者本人が承認できてしまう
   - `correction.userId !== approverUserId` チェックが欠落

5. **監査ログが書き込まれていない**
   - `AuditLog` テーブルはあるが、どのAPIも書き込んでいない
   - 管理者操作 (承認/却下/締め) の監査証跡がゼロ

### P1: ビジネスロジックの欠落

6. **承認 → TimeEntry反映が未実装**
   - 修正申請を承認しても、実際の打刻データが更新されない
   - コード内コメント: `"MVP: not applying changes to TimeEntry yet"`

7. **修正申請フォームで時刻入力不可**
   - 理由テキストのみ、希望時刻の入力UIがない
   - APIは `requestedClockInAt` 等を受け付けるが、UIが送信していない

8. **`as any` の濫用 — 型安全性の喪失**
   - `session.user as any` が全ファイルで使われている
   - next-auth の型拡張 (`declare module "next-auth"`) で解決すべき

---

## 4. 重要問題 (リリースまでに対応推奨)

### 機能面

| # | 問題 | 影響 |
|---|------|------|
| 9 | 日報機能 (DailyReport) 未実装 | スキーマのみ存在。使わないなら削除 |
| 10 | 休暇申請 (LeaveRequest) 未実装 | 同上 |
| 11 | 休暇残高 (LeaveLedger) 未実装 | 同上 |
| 12 | シフト管理未実装 | 同上 |
| 13 | ユーザー管理画面なし | seed以外でユーザー追加不可 |
| 14 | 部署管理画面なし | DB直接操作でしか設定不可 |
| 15 | 監査ログ閲覧UIなし | 書き込みもないが、仮に実装されてもビューアがない |
| 16 | 複数休憩未対応 | MVPで1回のみ。コード内に制約記載あり |
| 17 | 部署レベルの締め未実装 | `CloseScope.DEPARTMENT` はenum定義のみ |

### セキュリティ

| # | 問題 | 影響 |
|---|------|------|
| 18 | デモパスワード `password123` | seed がそのまま本番で使われるリスク |
| 19 | `AUTH_SECRET` の検証なし | 起動時にenv変数の存在・強度を検証していない |
| 20 | パスワード変更機能なし | ユーザーが自分でパスワードを変更できない |

### UX / UI

| # | 問題 | 影響 |
|---|------|------|
| 21 | インラインスタイルのみ | CSSフレームワーク/デザインシステムなし |
| 22 | レスポンシブ対応なし | モバイル表示で使いにくい |
| 23 | ローディング表示なし | Server Component のレンダリング待ちが無表示 |
| 24 | エラーページなし | カスタム404/500ページがない |
| 25 | 成功通知なし | 操作結果のフィードバックが不十分 |
| 26 | ファビコン未設定 | デフォルトNext.jsアイコンのまま |
| 27 | 言語設定 `lang="en"` | 日本語アプリなのに `<html lang="en">` |

### インフラ / DevOps

| # | 問題 | 影響 |
|---|------|------|
| 28 | テストなし | ビジネスロジックの回帰テストが不可能 |
| 29 | CI/CDなし | GitHub Actions等のパイプライン未設定 |
| 30 | Dockerfileなし | コンテナデプロイ不可 |
| 31 | ヘルスチェックなし | `/api/health` 未実装 |
| 32 | 構造化ログなし | `console.log` のみ |
| 33 | 環境変数バリデーションなし | 起動時に必須変数の検証をしていない |

### ドキュメント

| # | 問題 | 影響 |
|---|------|------|
| 34 | README がデフォルト | プロジェクト固有の説明なし |
| 35 | デプロイガイドなし | 本番環境への展開手順が未文書化 |
| 36 | API仕様書なし | OpenAPI/Swagger なし |

---

## 5. リリースまでのロードマップ (推奨)

### Phase 1: ビルド修復 & 型安全性 (最優先)

- [ ] Google Fonts → ローカルフォント or システムフォントに変更
- [ ] TypeScriptエラー 2件修正
- [ ] next-auth 型拡張 (`types/next-auth.d.ts`) を作成し `as any` 除去
- [ ] ESLint `generated/` ディレクトリを `.eslintignore` で除外
- [ ] `layout.tsx` のメタデータを適切に更新
- [ ] `<html lang="ja">` に変更

### Phase 2: セキュリティ & データ整合性

- [ ] 自己承認の禁止ロジック追加
- [ ] 監査ログ書き込みの実装 (承認/却下/締め操作)
- [ ] レート制限の導入 (少なくともログインAPI)
- [ ] 環境変数バリデーション (起動時チェック)
- [ ] seed スクリプトに本番利用警告を追加

### Phase 3: コアビジネスロジック完成

- [ ] 修正承認 → TimeEntry 反映ロジック実装
- [ ] 修正申請フォームに時刻入力UI追加
- [ ] ユーザー管理画面 (CRUD) の実装
- [ ] パスワード変更機能

### Phase 4: テスト & CI

- [ ] テストフレームワーク導入 (Vitest 推奨)
- [ ] 打刻API のユニットテスト
- [ ] 修正承認フローのインテグレーションテスト
- [ ] 月次締めロジックのテスト
- [ ] GitHub Actions で lint + typecheck + test を実行

### Phase 5: UI/UX 改善

- [ ] CSS フレームワーク導入 (Tailwind CSS 推奨)
- [ ] レスポンシブレイアウト対応
- [ ] loading.tsx / error.tsx / not-found.tsx の追加
- [ ] 操作成功時のフィードバック (トースト通知等)
- [ ] ファビコン・ブランディング設定

### Phase 6: インフラ & デプロイ

- [ ] Dockerfile 作成
- [ ] `/api/health` エンドポイント追加
- [ ] 構造化ログの導入
- [ ] デプロイガイド作成 (Vercel or Docker)
- [ ] 本番環境変数の管理方法を文書化

### Phase 7: 追加機能 (MVP後)

- [ ] 日報機能 or スキーマ削除の判断
- [ ] 休暇申請機能 or スキーマ削除の判断
- [ ] シフト管理機能 or スキーマ削除の判断
- [ ] 複数休憩対応
- [ ] 部署レベル締め
- [ ] 監査ログ閲覧UI
- [ ] CSV/PDF エクスポート

---

## 6. コード品質メトリクス

| 指標 | 値 |
|------|-----|
| TypeScript strict mode | 有効 |
| TSエラー | 2件 |
| ESLintエラー (generated除く) | 25件 |
| `as any` 使用箇所 | 約20箇所 |
| テストカバレッジ | 0% (テストなし) |
| API エンドポイント数 | 5 (auth含む) |
| Prisma モデル数 | 13 |
| 実装済モデル (API+UI) | 4/13 (User, TimeEntry, AttendanceCorrection, Close) |
| ページ数 | 4 (login, dashboard, corrections/new, root redirect) |
| コンポーネント数 | 4 (TimeClock, History, CorrectionsPanel, ClosePanel) |

---

## 7. 判定

**現在の状態: 内部テスト/デモ利用可能。本番リリースには Phase 1〜4 の完了が必要。**

最低限「使える状態」にするには Phase 1 (ビルド修復) と Phase 3 (コア機能完成) が必要。
商用リリースには Phase 1〜6 全てが必要。
