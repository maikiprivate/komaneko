# ビルドステージ
FROM node:22-alpine AS builder

WORKDIR /app

# pnpmを有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依存関係のインストール（キャッシュ効率化のため先にコピー）
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# ビルド
WORKDIR /app/packages/api
RUN pnpm build
RUN pnpm prisma generate

# 実行ステージ
FROM node:22-alpine

WORKDIR /app

# pnpmを有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# ビルド成果物をコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

WORKDIR /app/packages/api

# ポート公開
EXPOSE 3000

# 起動コマンド
CMD ["pnpm", "start"]
