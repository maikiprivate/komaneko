# 駒猫（Komaneko）

将棋をゲーム感覚で楽しく学べるアプリ

## 機能

| 機能 | 表示名 | 説明 |
|------|--------|------|
| 将棋学習 | 駒塾 | 駒の動かし方、基本の考え方 |
| 詰将棋 | 詰将棋 | レベル別の詰将棋問題 |
| 定跡 | 定跡 | 戦型別の定跡学習（予定） |

## 技術スタック

- **ランタイム**: Node.js 22 LTS
- **フレームワーク**: Fastify
- **ORM**: Prisma
- **データベース**: PostgreSQL
- **バリデーション**: Zod
- **テスト**: Vitest
- **Linter**: Biome

## セットアップ

<!-- TODO: Phase 1完了後に追記 -->

### 必要なもの

- Node.js 22
- pnpm
- Docker（PostgreSQL用）

### インストール

```bash
# 依存関係のインストール
pnpm install

# データベース起動
docker compose up -d

# マイグレーション
pnpm db:migrate

# 開発サーバー起動
pnpm dev
```

## プロジェクト構造

```
komaneko/
├── packages/
│   ├── api/      # バックエンドAPI（Fastify）
│   ├── app/      # モバイルアプリ（React Native）
│   ├── admin/    # 管理画面（React）
│   └── shared/   # 共有型定義・ユーティリティ
└── docs/         # ドキュメント
```

## ドキュメント

- [開発計画書](docs/ROADMAP.md)
- [AI開発ルール](.cursorrules)
- [Claude Code向けガイド](CLAUDE.md)

## 開発ルール

- レイヤー構造厳守: Router → Service → Repository
- 1機能 = 1コミット
- Service層・将棋ロジックはTDDで実装
- 詳細は [.cursorrules](.cursorrules) を参照

## ライセンス

<!-- TODO: ライセンス決定後に追記 -->
