# ビルドステージ
FROM node:22-alpine AS builder

WORKDIR /app

# pnpmを有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依存関係のインストール（キャッシュ効率化のため先にコピー）
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# sharedパッケージをビルド
WORKDIR /app/packages/shared
RUN pnpm build

# APIをビルド
WORKDIR /app/packages/api
# prisma generate はスキーマからクライアントを生成するだけでDB接続不要
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm prisma generate
RUN pnpm build

# 実行ステージ
FROM node:22-alpine

WORKDIR /app

# pnpmを有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# ビルド成果物をコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

WORKDIR /app/packages/api

# 起動スクリプトに実行権限を付与
RUN chmod +x scripts/start.sh

# ポート公開
EXPOSE 3000

# 起動時にマイグレーションを実行してからサーバーを起動
CMD ["./scripts/start.sh"]
