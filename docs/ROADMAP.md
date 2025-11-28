# 駒猫（Komaneko）リビルド計画

## 概要

manabi-shogi-backend（31,800行）のコア機能を抽出し、komanekoプロジェクトにシンプルで拡張性の高いアーキテクチャで再構築する。将棋をゲーム感覚で学べるアプリとして長期的にスケールできる設計を目指す。

### コア機能（優先順）

| 順位 | 機能 | 表示名 | 内部名 | 説明 |
|------|------|--------|--------|------|
| 1 | 将棋学習 | 駒塾 | lesson | 駒の動かし方、基本の考え方 |
| 2 | 詰将棋 | 詰将棋 | tsumeshogi | レベル別の詰将棋問題 |
| 3 | 定跡 | 定跡 | joseki | 戦型別の定跡学習（データ量多く後回し） |

### プラットフォーム（優先順）

| 順位 | プラットフォーム | 説明 |
|------|-----------------|------|
| 1 | API | バックエンド（Fastify） |
| 2 | モバイルアプリ | メインプラットフォーム（React Native） |
| 3 | 管理画面 | コンテンツ管理用（React + Vite）|

### 開発の前提

| 項目 | 内容 |
|------|------|
| 開発体制 | **一人開発** |
| ブランチ戦略 | feature/* → main（PRなし、直接マージ） |
| ローカルDB | Postgres.app（Docker不使用） |
| CI/CD | 後回し（必要になったら追加） |
| Pre-commit | 後回し（必要になったら追加） |

---

## 1. 設計原則・開発ルール（最重要）

### 1.1 アーキテクチャ原則

```
┌─────────────────────────────────────────────────────────┐
│                    基本方針                              │
├─────────────────────────────────────────────────────────┤
│ 1. シンプルさを保つ - 必要になるまで抽象化しない          │
│ 2. 一貫性を保つ - 同じパターンを全モジュールで使う        │
│ 3. 明示的にする - 暗黙の依存や動作を避ける               │
│ 4. テスト可能にする - モック可能な設計                   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 レイヤー構造（厳守）

```
┌──────────────────────────────────────┐
│           Router Layer               │  ← HTTPリクエスト処理のみ
│   (入力検証、レスポンス整形)           │
├──────────────────────────────────────┤
│           Service Layer              │  ← ビジネスロジックのみ
│   (ユースケース、ドメインルール)        │
├──────────────────────────────────────┤
│         Repository Layer             │  ← データアクセスのみ
│   (DB操作、外部API呼び出し)            │
└──────────────────────────────────────┘

 ルール:
- Router → Service → Repository の一方向依存
- 同レイヤー間の直接呼び出し禁止
- ビジネスロジックはService層に集約
```

### 1.3 コーディング規約

```typescript
// ファイル命名規則
feature.router.ts      // ルーター
feature.service.ts     // サービス
feature.repository.ts  // リポジトリ
feature.schema.ts      // Zodスキーマ（入出力型定義）
feature.types.ts       // 内部型定義
feature.test.ts        // テスト

// 関数命名規則
// Router: HTTP動詞ベース
handleGetJoseki(), handleCreateJoseki()

// Service: ユースケースベース
getJosekiById(), createJoseki(), updateJosekiVisibility()

// Repository: データ操作ベース
findById(), findMany(), insert(), update(), delete()

// エラーハンドリング
// - 独自エラークラスを使用
// - エラーコードを定義（文字列比較禁止）
throw new NotFoundError('JOSEKI_NOT_FOUND', 'Joseki not found')
throw new ValidationError('INVALID_SFEN', 'Invalid SFEN format')
```

### 1.4 ディレクトリ構造ルール

```
src/
├── modules/           # 機能モジュール（ドメイン単位）
│   └── [feature]/     # 1機能 = 1ディレクトリ
│       ├── *.router.ts
│       ├── *.service.ts
│       ├── *.repository.ts
│       ├── *.schema.ts
│       └── *.test.ts
├── shared/            # 共有コード（慎重に追加）
│   ├── errors/        # エラー定義
│   ├── middleware/    # 共通ミドルウェア
│   └── utils/         # 純粋関数のみ
└── db/                # データベース関連

ルール:
- sharedへの追加は3箇所以上で使用する場合のみ
- utilsは副作用のない純粋関数のみ
- 循環依存禁止（eslintで強制）
```

### 1.5 Git・コミット規約（厳守）

```
# ブランチ戦略
- main: 本番環境（直接コミット禁止）
- feature/*: 機能開発（例: feature/phase0-docs）
- fix/*: バグ修正

# ワークフロー（必須）
1. 新しい作業を始める前に必ずブランチを作成
2. 1機能 = 1コミット（細かすぎる分割禁止）
3. コミット前に必ずユーザーに許可を求める
4. 勝手にコミットしない（AIへの重要ルール）

# コミットメッセージ
feat: 新機能追加
fix: バグ修正
refactor: リファクタリング（機能変更なし）
docs: ドキュメント
test: テスト追加・修正
chore: ビルド・設定変更

# PR作成ルール
- 1PR = 1機能 or 1修正
- WIP PRを活用（早めにレビュー依頼）
- テスト必須
```

### 1.6 セキュリティ原則

```
1. 入力は常にバリデーション（Zodスキーマ必須）
2. 出力はサニタイズ（XSS防止）
3. SQLはPrisma経由のみ（インジェクション防止）
4. 認証トークンはHTTPOnly Cookie
5. シークレットは環境変数（.envはコミット禁止）
6. レート制限を全エンドポイントに適用
7. 認可はService層で実装（Prisma使用のため）
   - 全Serviceメソッドでユーザー権限チェック必須
   - 他ユーザーのデータへのアクセス禁止をテストで検証
```

### 1.7 テスト原則

```
テストピラミッド:
- Unit Tests: 70%（ドメインロジック中心）
- Integration Tests: 20%（API + DB）
- E2E Tests: 10%（クリティカルパス）

カバレッジ目標:
- コアドメイン（将棋ルール、学習ロジック）: 90%以上
- Service層: 80%以上
- Router層: 60%以上
```

---

## 2. 技術スタック（再検討版）

| 項目 | 選択 | 理由 |
|------|------|------|
| ランタイム | **Node.js 22 LTS** | 情報量最多、AI学習データ豊富、安定性 |
| フレームワーク | **Fastify** | Express並の情報量、高速、TypeScript対応良好 |
| ORM | **Prisma** | 情報量最多、型安全、AI対応良好、エコシステム充実 |
| DB | **PostgreSQL**（統一） | 開発・本番同一環境で差異リスク排除 |
| デプロイ | **Railway** | PostgreSQL対応、自動デプロイ |
| 認証 | **セッション + JWT** | Web=セッション、アプリ=JWT |
| バリデーション | **Zod** | 型推論、Prismaと相性良好 |
| テスト | **Vitest** | 高速、ESM対応 |
| Linter | **Biome** | ESLint+Prettierより高速 |
| ログ | **Pino** | Fastify標準、構造化JSON出力 |

### 後から追加（必要になったら）
- **Redis** - 水平スケール時にセッション・キャッシュ用
- **Sentry** - 本番ユーザー増加後にエラー監視
- **Swagger** - 外部API公開時に自動生成

### 技術選定の理由詳細

**Node.js（Bunではなく）:**
- ネット上の情報量が圧倒的に多い
- AIの学習データが豊富（Claude/GPTが詳しい）
- 本番環境での実績と安定性
- npm エコシステムとの完全互換

**Fastify（Honoではなく）:**
- Expressに次ぐ情報量とコミュニティ
- JSON Schema/TypeBox統合で型安全
- プラグインシステムで拡張性高い
- Node.js最速クラスのパフォーマンス

**Prisma（Drizzleではなく）:**
- 情報量とドキュメントが充実
- AIが詳しい（クエリ例が豊富）
- マイグレーションが堅牢
- Prisma Studioでデータ確認容易

**PostgreSQL統一:**
- 開発と本番の環境差異によるバグを防止
- Docker Composeで簡単にローカル起動
- RailwayでもPostgreSQL標準サポート

---

## 3. プロジェクト構造（モノレポ）

```
komaneko/
├── package.json              # ルート（pnpm workspaces）
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
├── mise.toml                 # ツールバージョン管理（Node.js等）
├── docker-compose.yml        # ローカルPostgreSQL
├── .env.example
│
├── .cursorrules              # AI自動読込ルール（必須・最初に作成）
├── CLAUDE.md                 # Claude Code向けガイド（最初に作成）
├── ARCHITECTURE.md           # 設計原則（Phase 1後に作成）
│
├── packages/
│   ├── api/                  # バックエンドAPI
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts       # シードデータ
│   │   └── src/
│   │       ├── index.ts
│   │       ├── app.ts        # Fastifyアプリ + プラグイン登録
│   │       ├── db/
│   │       │   └── client.ts
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── lesson/       # 駒塾（将棋学習）【優先】
│   │       │   ├── tsumeshogi/
│   │       │   ├── joseki/       # 定跡【後回し】
│   │       │   ├── hearts/
│   │       │   ├── streak/
│   │       │   └── views/    # BFF（画面用API）
│   │       │       ├── home.router.ts
│   │       │       └── home.service.ts
│   │       ├── shared/
│   │       │   ├── errors/   # AppError クラス
│   │       │   ├── middleware/ # 認証、レート制限、CORS
│   │       │   ├── utils/
│   │       │   └── shogi/    # 将棋固有ロジック（SFEN処理等）
│   │       └── test/
│   │           └── fixtures/ # テストデータファクトリ
│   │       # ※ テストファイルは実装ファイルと同階層に配置
│   │       # 例: joseki.service.ts → joseki.service.test.ts
│   │
│   ├── app/                  # モバイルアプリ（React Native / Expo）【優先度2】
│   │   └── src/
│   │
│   ├── admin/                # 管理画面（React + Vite + React Router）【優先度3】
│   │   └── src/
│   │       ├── main.tsx      # エントリーポイント
│   │       ├── router.tsx    # React Routerルート定義
│   │       ├── pages/        # ページコンポーネント
│   │       │   ├── Dashboard.tsx
│   │       │   ├── LessonList.tsx
│   │       │   ├── LessonEdit.tsx
│   │       │   └── TsumeshogiList.tsx
│   │       ├── components/   # 共有コンポーネント（フラット構造）
│   │       └── api/          # APIクライアント
│   │
│   └── shared/               # 共有型定義・ユーティリティ
│       └── src/
│           ├── types/        # API型定義
│           ├── constants/    # 共通定数
│           └── brand/        # ブランド情報
│               ├── index.ts
│               ├── app.ts    # アプリ名、バージョン
│               ├── colors.ts # カラーパレット
│               └── messages.ts # 共通メッセージ（猫キャラなど）
│
└── docs/
    ├── ROADMAP.md            # 開発計画書（本ファイル）
    ├── CODING_STANDARDS.md   # コーディング規約（1ファイルに統合）
    └── CHANGELOG.md          # 機能変更履歴
```

### ブランド情報（packages/shared/src/brand/）

```typescript
// packages/shared/src/brand/app.ts
export const APP_NAME = 'こまねこ'
export const APP_NAME_EN = 'Komaneko'
export const APP_TAGLINE = '将棋をもっと楽しく学ぼう'
export const APP_VERSION = '0.1.0'

// packages/shared/src/brand/colors.ts
export const COLORS = {
  primary: '#...',
  secondary: '#...',
  background: '#...',
  // ...
}
```

### CLAUDE.md（AI継続開発用）

```markdown
# Claude Code 開発ガイド

## 最初に読むべきファイル
1. ARCHITECTURE.md - 設計原則（必読）
2. docs/CODING_STANDARDS.md - コーディング規約

## 現在の開発状況
- 現在のフェーズ: Phase X
- 最後のセッション: YYYY-MM-DD
- 作業中の機能: ○○

## 重要な設計判断
- レイヤー構造を厳守（Router → Service → Repository）
- BFF（views/）はドメインServiceを呼び出すだけ
- エラーは AppError クラスを使用
- 全APIエンドポイントにテスト必須

## 注意事項
- 既存のパターンに従う
- 新しいパターンを導入する前に相談
```

### .cursorrules（AI自動読込ルール）

CursorやClaude Codeが自動的に読み込むファイル。開発中に常に参照されるルールを記載。

```
# Komaneko Development Rules

## Project Structure
- Monorepo with pnpm workspaces
- packages/api: Fastify backend
- packages/admin: React admin panel
- packages/shared: Shared types and utilities

## Coding Standards
- TypeScript strict mode
- Functional programming patterns
- 日本語でコミュニケーション

## Naming Conventions
- Components: PascalCase (JosekiList.tsx)
- Functions: camelCase (getJosekiById)
- Files: kebab-case or dot notation (joseki.service.ts)

## Layer Rules (STRICT)
- Router → Service → Repository (one-way only)
- No cross-layer imports
- Business logic in Service layer only

## Database & Authorization
- Use Prisma only, no raw SQL
- Authorization logic in Service layer (not DB level)
- Always check user ownership before data access

## Testing
- All API endpoints must have tests
- Service layer: 80%+ coverage
```

### mise.toml（ツールバージョン管理）

開発環境を統一するためのツールバージョン管理。

```toml
[tools]
node = "22"

[tasks]
dev = "pnpm dev"
build = "pnpm build"
test = "pnpm test"
lint = "pnpm lint"
```

---

## 4. API設計（バージョンレス）

### バージョニング方針

```
❌ 避ける: /api/v1/joseki, /api/v2/joseki
✅ 採用: /api/joseki

理由:
- v1/v2の並行運用は保守コスト増大
- 破壊的変更は新エンドポイント追加で対応
- 例: /api/joseki/legacy (旧仕様維持が必要な場合のみ)
```

### エンドポイント設計

```
# ========== 画面統合エンドポイント（BFFパターン）==========
# 画面ごとに必要な情報をまとめて返す
GET /api/home/status          # ホーム画面用（hearts, streak, progress, todayGoal）
GET /api/lesson/:id/study     # 駒塾学習画面用（lesson, steps, userProgress）
GET /api/tsumeshogi/:id/play  # 詰将棋プレイ画面用（problem, solutions, userRecord）

# ========== 認証 ==========
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/session/anonymous

# ========== 駒塾（将棋学習）==========【優先】
GET    /api/lesson
GET    /api/lesson/:id
POST   /api/lesson                  # 管理者
PATCH  /api/lesson/:id              # 管理者
DELETE /api/lesson/:id              # 管理者

# ========== 詰将棋 ==========
GET    /api/tsumeshogi
GET    /api/tsumeshogi/:id
POST   /api/tsumeshogi              # 管理者
PATCH  /api/tsumeshogi/:id          # 管理者
DELETE /api/tsumeshogi/:id          # 管理者

# ========== 定跡 ==========【後回し】
GET    /api/joseki
GET    /api/joseki/:id
POST   /api/joseki
PATCH  /api/joseki/:id
DELETE /api/joseki/:id
POST   /api/joseki/:id/moves
POST   /api/joseki/:id/tags

# ========== ゲーミフィケーション（シンプル命名）==========
GET  /api/hearts                    # ハート状態
POST /api/hearts/consume            # ハート消費
GET  /api/streak                    # 連続記録
POST /api/progress                  # 学習記録保存

# ========== システム ==========
GET /api/health
```

### API設計原則

```
1. 画面単位の統合エンドポイントを優先
   - N+1リクエスト問題を回避
   - モバイルアプリのパフォーマンス向上

2. 個別エンドポイントは管理画面・デバッグ用に残す

3. URL階層は浅く保つ
   ❌ /api/learning/hearts
   ✅ /api/hearts
```

### レスポンス形式統一

```typescript
// 成功
{
  "data": { ... },
  "meta": { "timestamp": "..." }
}

// エラー
{
  "error": {
    "code": "JOSEKI_NOT_FOUND",
    "message": "指定された定跡が見つかりません"
  }
}

// ページネーション
{
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 5. 運用・インフラストラクチャ（YAGNI原則）

### 5.1 初期実装（必須）

```
ログ（Pino）:
- JSON構造化ログ
- リクエストID（correlation ID）で追跡
- ログレベル: error > warn > info > debug
- 含める情報: userId, sessionId, lessonId

ヘルスチェック:
- GET /api/health → DB接続確認のみ（1種類で十分）

セキュリティ:
- レート制限（@fastify/rate-limit）
  - 認証エンドポイント: 5 req/min
  - 一般API: 100 req/min
  - ゲーム操作: 30 req/min
- CORS（@fastify/cors）
  - 許可オリジンをホワイトリスト
  - credentials: true（Cookie送信用）
- 入力バリデーション
  - 全入力をZodスキーマで検証
  - Router層で検証、Service層に到達前にエラー

セッション管理:
- インメモリセッション（初期）
- Cookie-based認証

DBインデックス:
- users(email) - UNIQUE
- user_progress(user_id, lesson_id) - 複合
- game_history(user_id, created_at) - 履歴クエリ
```

### 5.2 信頼性（初期実装）

```
グレースフルシャットダウン:
- SIGTERM/SIGINT ハンドリング
- 新規接続の受付停止
- 進行中リクエストの完了待機（30秒）
- DB接続のクローズ

タイムアウト:
- リクエスト: 30秒
- DBクエリ: 10秒
```

### 5.3 後から追加（スケール時）

```
水平スケール対応時:
- Redis（セッション・キャッシュ）
- レスポンス圧縮（@fastify/compress）

本番運用安定後:
- Sentry（エラー監視）
- メトリクス収集（Prometheus）
- E2Eテスト（Playwright）

さらに後（ローンチ後）:
- 分散トレーシング（OpenTelemetry）
- 国際化（i18n）
```

---

## 6. データベース設計

### テーブル一覧

| カテゴリ | テーブル | 説明 | 優先度 |
|---------|---------|------|--------|
| コア | users | ユーザー | 高 |
| コア | sessions | セッション（匿名対応） | 高 |
| コア | positions | 局面（SFEN） | 高 |
| 駒塾 | lessons | レッスン（駒の動かし方等） | 高 |
| 駒塾 | lesson_steps | レッスンのステップ | 高 |
| 詰将棋 | tsumeshogis | 詰将棋問題 | 中 |
| 詰将棋 | tsumeshogi_solutions | 解答 | 中 |
| 定跡 | josekis | 定跡 | 低（後回し） |
| 定跡 | joseki_moves | 手順 | 低 |
| 定跡 | tags | タグ | 低 |
| 定跡 | joseki_tags | 定跡-タグ関連 | 低 |
| 定跡 | formations | 戦型 | 低 |
| ゲーミフィケーション | hearts | ハート（残機） | 高 |
| ゲーミフィケーション | streaks | 連続記録 | 高 |
| ゲーミフィケーション | learning_records | 学習記録 | 高 |

※ Prismaスキーマの詳細は実装時に作成

---

## 7. 実装フェーズ（アプリ先行版）

### 開発方針
```
アプリモック → API実装 → API接続

理由:
- 画面を先に作ることで仕様が明確になる
- 不要なAPIを作らずに済む
- Expo Goで随時フィードバックを得られる
```

### MVP定義
**ホーム画面 + 駒塾 + 詰将棋**（ゲーミフィケーション含む）

---

### ⚠️ 重要：共通化ルール（manabi-shogiの教訓）

**原則:**
- 2画面以上で使う → 共通化を検討
- ビジネスルールに関わる → 必ず共通化
- 画面ごとに別実装を絶対に作らない

```
packages/app/src/
│
├── shogi/                      # 🎯 将棋コア
│   ├── components/
│   │   └── ShogiBoard.tsx      # 将棋盤（1つだけ！）
│   ├── logic/
│   │   ├── rules.ts            # 将棋ルール（合法手判定等）
│   │   ├── sfen.ts             # SFEN変換
│   │   └── cpu.ts              # CPUロジック（将来）
│   └── assets/
│       └── pieces/             # 駒画像
│
├── core/                       # 🎯 アプリコア
│   ├── gamification/
│   │   ├── hearts.ts           # ハート消費・回復ロジック
│   │   ├── streak.ts           # 連続学習日数計算
│   │   └── useHeartGuard.ts    # ハートなし時の制御
│   ├── learning/
│   │   ├── progress.ts         # 進捗管理
│   │   └── records.ts          # 学習記録
│   └── ui/
│       ├── LoadingState.tsx    # 共通ローディング
│       └── ErrorBoundary.tsx   # エラーハンドリング
│
└── screens/                    # 画面（共通モジュールを使う側）
```

**今後も増える可能性があるため、新機能追加時は:**
1. まず既存の共通モジュールで対応できないか確認
2. 新規作成する場合は shogi/ または core/ に配置
3. 画面固有のロジックは最小限に

---

### Phase 0: ドキュメント（完了）
- [x] .cursorrules 作成
- [x] mise.toml 作成
- [x] CLAUDE.md 作成
- [x] docs/ROADMAP.md 作成
- [x] README.md 作成

### Phase 1: API基盤（完了）
- [x] モノレポ初期化（pnpm workspaces）
- [x] 共通設定（biome.json, tsconfig）
- [x] PostgreSQL セットアップ（Postgres.app）
- [x] Prismaセットアップ・初期マイグレーション
- [x] Fastifyアプリ基本構成
- [x] エラーハンドリング基盤（AppError）
- [x] 構造化ログ設定（Pino）
- [x] ヘルスチェックエンドポイント
- [x] レート制限・CORS設定

---

## Part A: アプリモック開発

### Phase 2: アプリ基盤 + ホーム画面（完了）
- [x] Expo (Managed) プロジェクト初期化
- [x] Expo Router セットアップ
- [x] ナビゲーション構造（Tab / Stack）
- [x] テーマ・カラー定義
- [x] 駒猫キャラクター表示
- [x] ホーム画面（モックデータ）
  - ハート表示（ゲージ形式）
  - ストリーク表示（週カレンダー + 連続日接続線）
  - ヘッダーロゴ
- [x] 📱 Expo Go で動作確認

### Phase 3: 将棋盤共通コンポーネント（完了）

**目標**: 詰将棋・駒塾で共通利用する将棋盤コンポーネントを作成

#### ディレクトリ構造
```
packages/app/
├── components/
│   └── shogi/
│       ├── ShogiBoard.tsx      # 盤面 + ラベル + 視点対応
│       ├── Piece.tsx           # 駒表示
│       └── PieceStand.tsx      # 駒台
│
├── lib/
│   └── shogi/
│       ├── types.ts            # 型 + 定数
│       ├── sfen.ts             # SFEN解析
│       ├── perspective.ts      # 視点変換（テスト容易）
│       └── pieceImages.ts      # 駒画像マッピング
│
├── mocks/
│   └── tsumeshogiData.ts       # 詰将棋モックデータ
│
└── assets/images/pieces/       # 駒画像14枚
```

#### 視点変換（perspective.ts）の役割
manabi-shogiで問題になった先手/後手視点の切り替えを集約：
- `transformBoardForPerspective()` - 盤面の180度回転
- `getFileLabels()` / `getRankLabels()` - 座標ラベル生成
- `getPieceStandOrder()` - 駒台表示順序

**原則**: データは常にSFEN標準（先手視点）、変換は表示時のみ

#### 完了タスク
- [x] 駒画像アセット（14枚）
- [x] lib/shogi/types.ts（型定義）
- [x] lib/shogi/sfen.ts（SFEN解析）
- [x] lib/shogi/perspective.ts（視点変換）
- [x] lib/shogi/pieceImages.ts（画像マッピング）
- [x] components/shogi/Piece.tsx
- [x] components/shogi/ShogiBoard.tsx
- [x] components/shogi/PieceStand.tsx
- [x] mocks/tsumeshogiData.ts
- [x] 詰将棋画面に統合
- [x] 駒塾画面に統合
- [x] 📱 Expo Go でフィードバック取得

#### 将来追加（今は作らない）
- lib/shogi/moves.ts（合法手生成）
- lib/shogi/engine.ts（エンジン連携）
- components/shogi/PromotionDialog.tsx（成り確認）

### Phase 4: 詰将棋画面（作業中）

**目標**: 詰将棋機能のモック画面を完成させる

- [x] 詰将棋一覧画面（手数タブ、ステータスフィルタ）
- [x] ヘッダー統一（LogoHeader + 設定アイコン）
- [ ] 詰将棋プレイ画面（共通将棋盤使用）
- [ ] 解答表示・解説
- [ ] 進捗表示（解答済み/未解答）
- [ ] 📱 Expo Go でフィードバック取得

### Phase 5: 駒塾画面（モック）
- [ ] レッスン一覧画面
- [ ] レッスン学習画面（共通将棋盤使用）
- [ ] 進捗表示
- [ ] 📱 Expo Go でフィードバック取得

### Phase 6: アプリコア（ゲーミフィケーション）
- [ ] **core/ 共通モジュール作成**
  - ハートロジック（消費・回復・制限）
  - ストリークロジック（日数計算）
  - 学習記録

---

## Part B: API開発

### Phase 7: 認証API
- [ ] 匿名ユーザー作成
- [ ] セッション管理（Cookie-based）
- [ ] 認証ミドルウェア
- [ ] ユニットテスト

### Phase 8: コンテンツAPI
- [ ] 駒塾CRUD（Router → Service → Repository）
- [ ] レッスンステップ管理
- [ ] 詰将棋CRUD
- [ ] 難易度・手数フィルタ
- [ ] 解答管理
- [ ] ユニット・統合テスト（TDD）

### Phase 9: ゲーミフィケーションAPI + BFF
- [ ] ハートシステム（消費・回復）
- [ ] 連続記録（日付計算）
- [ ] 学習記録
- [ ] BFF統合エンドポイント
  - GET /api/home/status
  - GET /api/lesson/:id/study
  - GET /api/tsumeshogi/:id/play
- [ ] テスト作成（TDD）

---

## Part C: 統合・リリース

### Phase 10: アプリ-API接続
- [ ] 認証フロー実装
- [ ] モックデータ → API呼び出しに置き換え
- [ ] ローディング状態UI
- [ ] エラーハンドリングUI
- [ ] オフライン対応（任意）

### Phase 11: 管理画面
- [ ] React + Vite設定
- [ ] 駒塾・詰将棋管理画面
- [ ] コンテンツ投入

### Phase 12: デプロイ
- [ ] シードデータ作成
- [ ] Railway設定
- [ ] 本番環境テスト
- [ ] App Store / Google Play 準備（任意）

---

### 将来フェーズ（必要になったら）
- [ ] 定跡モジュール（データ量多いため後回し）
- [ ] Redis導入（水平スケール時）
- [ ] Sentry統合（ユーザー増加後）
- [ ] プッシュ通知
- [ ] ソーシャル機能

---

## 8. 将来の拡張

### YaneuraOu統合（後から追加）

```typescript
// packages/api/src/engine/client.ts
interface EngineClient {
  evaluate(sfen: string, depth?: number): Promise<Evaluation>
  solveTsumeshogi(sfen: string): Promise<Solution[]>
  getBestMove(sfen: string): Promise<string>
}
```

### 定跡モジュール（データ準備後）

- 戦型別の定跡学習
- 手順管理（joseki_moves）
- タグ・戦型設定

### 削除する機能（manabi-shogiから移植しない）

- AI生成キャッシュ
- 複雑な学習ログ
- 棋譜記法学習

---

## 9. 参照すべきファイル（実装時）

1. `/Users/maikishinbo/Projects/manabi_shogi_web/manabi-shogi-backend/prisma/schema.prisma` - 既存スキーマ
2. `/Users/maikishinbo/Projects/manabi_shogi_web/manabi-shogi-backend/src/domain/entities/` - ドメインモデル
3. `/Users/maikishinbo/Projects/manabi_shogi_web/manabi-shogi-backend/src/utils/SfenProcessor.ts` - SFEN処理
