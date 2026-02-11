#!/bin/bash
# Neon データベース初期セットアップスクリプト
# 使い方: ./scripts/setup-neon.sh "postgresql://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require"

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "❌ 使い方: $0 <DATABASE_URL>"
  echo ""
  echo "例:"
  echo "  $0 \"postgresql://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require\""
  echo ""
  echo "Neon Console (https://console.neon.tech) から接続文字列をコピーしてください。"
  exit 1
fi

DATABASE_URL="$1"

echo "=== Neon データベースセットアップ ==="
echo ""

# 1. Prisma クライアント生成
echo "1/3: Prisma クライアントを生成中..."
npx prisma generate
echo "  ✅ 完了"
echo ""

# 2. マイグレーション実行
echo "2/3: マイグレーションを実行中..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
echo "  ✅ 完了"
echo ""

# 3. デモデータ投入
echo "3/3: デモデータを投入中..."
DATABASE_URL="$DATABASE_URL" npx tsx prisma/seed.ts
echo "  ✅ 完了"
echo ""

echo "=== セットアップ完了 ==="
echo ""
echo "デモアカウント:"
echo "  会社ID:     demo"
echo "  メール:     admin@demo.local"
echo "  パスワード: password123"
echo ""
echo "次のステップ:"
echo "  1. Vercel にリポジトリをインポート"
echo "  2. 環境変数を設定:"
echo "     DATABASE_URL = $DATABASE_URL"
echo "     AUTH_SECRET   = (npx auth secret で生成)"
echo "  3. デプロイを実行"
