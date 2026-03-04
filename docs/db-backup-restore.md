# データベースバックアップ・リストア手順書

## 概要

Workforce Nexus は PostgreSQL 16 (Neon) を使用しています。
本ドキュメントでは、本番環境のデータベースバックアップとリストアの手順を記載します。

---

## 1. Neon のポイント・イン・タイム・リカバリ（PITR）

Neon は自動的にブランチ単位で WAL を保存しており、過去 7 日間（Pro プラン: 30 日間）の任意の時点にリストア可能です。

### Neon Console からのリストア

1. [Neon Console](https://console.neon.tech) にログイン
2. 対象プロジェクトを選択
3. **Branches** → 対象ブランチの **...** メニュー → **Restore from**
4. 日時を指定してリストア

### Neon CLI からのリストア

```bash
# Neon CLI をインストール
npm install -g neonctl

# ブランチを特定時点にリストア
neonctl branches restore <branch-id> --timestamp "2025-01-15T10:30:00Z"
```

---

## 2. pg_dump による手動バックアップ

Neon の自動バックアップに加え、定期的な手動バックアップを推奨します。

### バックアップ取得

```bash
# 環境変数を設定
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/workforce_app?sslmode=require"

# カスタム形式（推奨: 最も柔軟）
pg_dump "$DATABASE_URL" -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump

# SQL 形式（可読性が高い）
pg_dump "$DATABASE_URL" --clean --if-exists -f backup_$(date +%Y%m%d_%H%M%S).sql

# テーブル指定（大きなテーブルのみ）
pg_dump "$DATABASE_URL" -Fc -t '"TimeEntry"' -t '"AuditLog"' -f partial_backup.dump
```

### バックアップの自動化（cron）

```bash
# /etc/cron.d/workforce-backup
# 毎日 AM 3:00 (JST) にバックアップ
0 18 * * * root /opt/workforce/scripts/backup.sh
```

`/opt/workforce/scripts/backup.sh`:
```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/workforce/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# バックアップ取得
pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_DIR/workforce_$DATE.dump"

# 古いバックアップを削除
find "$BACKUP_DIR" -name "workforce_*.dump" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed: workforce_$DATE.dump"
```

---

## 3. リストア手順

### カスタム形式からのリストア

```bash
# 完全リストア（既存データを上書き）
pg_restore --clean --if-exists -d "$DATABASE_URL" backup_20250115_030000.dump

# 特定テーブルのみリストア
pg_restore -d "$DATABASE_URL" -t '"User"' backup.dump
```

### SQL 形式からのリストア

```bash
psql "$DATABASE_URL" < backup_20250115_030000.sql
```

### リストア後の確認

```bash
# レコード数を確認
psql "$DATABASE_URL" -c "
  SELECT 'User' as table_name, COUNT(*) FROM \"User\"
  UNION ALL
  SELECT 'Tenant', COUNT(*) FROM \"Tenant\"
  UNION ALL
  SELECT 'TimeEntry', COUNT(*) FROM \"TimeEntry\"
  UNION ALL
  SELECT 'AuditLog', COUNT(*) FROM \"AuditLog\";
"

# Prisma のマイグレーション状態を確認
npx prisma migrate status
```

---

## 4. 環境間のデータ移行

### 本番 → ステージング

```bash
# 本番からダンプ
pg_dump "$PRODUCTION_DATABASE_URL" -Fc -f prod_snapshot.dump

# ステージングにリストア
pg_restore --clean --if-exists -d "$STAGING_DATABASE_URL" prod_snapshot.dump

# PII のマスキング（ステージング環境）
psql "$STAGING_DATABASE_URL" -c "
  UPDATE \"User\" SET
    email = 'user_' || id || '@example.com',
    name = 'テストユーザー ' || LEFT(id, 4),
    \"passwordHash\" = NULL
  WHERE role != 'SUPER_ADMIN';
"
```

---

## 5. 障害時のチェックリスト

1. **障害の範囲を確認**: Neon ステータスページ (https://neonstatus.com) を確認
2. **最新バックアップの確認**: Neon Console でブランチの最終更新時刻を確認
3. **リストア判断**: データ損失の範囲と PITR で回復可能か判断
4. **リストア実行**: 上記手順に従ってリストア
5. **アプリケーション確認**: `/api/health` エンドポイントで接続を確認
6. **データ整合性確認**: 主要テーブルのレコード数を確認
7. **関係者への連絡**: Slack アラートチャンネルで報告

---

## 6. 注意事項

- **接続文字列の `sslmode=require`** を必ず使用すること（Neon は SSL 必須）
- バックアップファイルには顧客データが含まれるため、**暗号化して保管** すること
- 定期的にリストア手順の **テスト実行** を行うこと（月1回推奨）
- Neon のフリープランでは PITR が 7 日間のため、Pro プラン以上を推奨
