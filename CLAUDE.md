# 駒猫 - Claude Code 開発ガイド

このファイルは Claude Code がプロジェクトを理解するための参照情報です。
開発ルールは `.cursorrules` を参照してください。

---

## 開発の前提

| 項目 | 内容 |
|------|------|
| 開発体制 | **一人開発** |
| ブランチ戦略 | feature/* → main（PRなし、直接マージ） |
| ローカルDB | Postgres.app（Docker不使用） |
| CI/CD | 後回し（必要になったら追加） |
| Pre-commit | 後回し（必要になったら追加） |

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| 名前 | 駒猫（こまねこ / Komaneko） |
| コンセプト | 将棋をゲーム感覚で学べるアプリ |
| ターゲット | 将棋初心者〜中級者 |
| メインプラットフォーム | モバイルアプリ |
| サブプラットフォーム | Web管理画面 |

### コア機能（優先順）

| 順位 | 機能 | 表示名 | 内部名 | 説明 |
|------|------|--------|--------|------|
| 1 | 将棋学習 | 駒塾 | lesson | 駒の動かし方、基本の考え方 |
| 2 | 詰将棋 | 詰将棋 | tsumeshogi | レベル別の詰将棋問題 |
| 3 | 定跡 | 定跡 | joseki | 戦型別の定跡学習（データ量多く後回し） |

### ゲーミフィケーション
- **ハート（hearts）**: 残機システム
- **ストリーク（streak）**: 連続学習記録
- **進捗（progress）**: 学習進捗管理

---

## 技術スタック

| 項目 | 選択 |
|------|------|
| ランタイム | Node.js 22 LTS |
| フレームワーク | Fastify |
| ORM | Prisma |
| データベース | PostgreSQL |
| バリデーション | Zod |
| テスト | Vitest |
| リンター | Biome |
| ログ | Pino |

### 後から追加予定（YAGNI）
- Redis（水平スケール時）
- Sentry（本番運用安定後）
- Swagger（外部API公開時）

---

## プロジェクト構造

```
komaneko/
├── .cursorrules          # 開発ルール（AIが自動読込）
├── CLAUDE.md             # このファイル
├── mise.toml             # ツールバージョン管理
├── packages/
│   ├── api/              # バックエンドAPI（Fastify）【優先度1】
│   │   ├── prisma/       # スキーマ・マイグレーション
│   │   └── src/
│   │       ├── modules/  # 機能モジュール
│   │       │   ├── auth/
│   │       │   ├── lesson/      # 駒塾（将棋学習）
│   │       │   ├── tsumeshogi/
│   │       │   ├── joseki/      # 後回し
│   │       │   ├── hearts/
│   │       │   ├── streak/
│   │       │   └── views/       # BFF（画面用API）
│   │       └── shared/
│   │           ├── errors/
│   │           ├── middleware/
│   │           └── shogi/       # 将棋ロジック
│   ├── app/              # モバイルアプリ（React Native）【優先度2】
│   ├── admin/            # 管理画面（React + Vite）【優先度3】
│   └── shared/           # 共有型定義
└── docs/
    ├── ROADMAP.md        # 開発計画書（What: 何を作るか）
    ├── designs/          # 設計ドキュメント（How: どう作るか）
    │   ├── README.md     # ガイドライン
    │   └── *.md          # 機能ごとの詳細設計
    └── CODING_STANDARDS.md  # 詳細な規約（Phase 1後に作成）
```

---

## 設計ドキュメント（docs/designs/）

複雑なロジックの詳細設計を管理するディレクトリ。

### このディレクトリに入れるもの
- 複雑なロジックの詳細設計
- 複数コンポーネントにまたがる機能
- アーキテクチャ決定の背景と理由

### このディレクトリに入れないもの（ROADMAP.mdで十分）
- 単純なCRUD機能
- 小規模なUI修正
- バグ修正

### 命名規則
- `{機能名}.md`（ケバブケース）
- 日付は入れない（Gitで履歴管理）

---

## アーキテクチャ

### レイヤー構造
```
Router → Service → Repository（一方向のみ）
```
- **Router**: HTTP処理、入力検証、レスポンス整形
- **Service**: ビジネスロジック、認可チェック、TDDで実装
- **Repository**: Prismaによるデータアクセス

### BFFパターン
画面ごとに必要なデータをまとめて返すエンドポイント：
- `GET /api/home/status` - ホーム画面用
- `GET /api/lesson/:id/study` - 駒塾学習画面用
- `GET /api/tsumeshogi/:id/play` - 詰将棋プレイ画面用

### API設計
- バージョンレス（`/api/lesson`、`/api/v1/lesson` ではない）
- 浅いURL階層（`/api/hearts`、`/api/learning/hearts` ではない）

---

## APIレスポンス形式

```typescript
// 成功
{
  "data": { ... },
  "meta": { "timestamp": "2025-01-01T00:00:00Z" }
}

// エラー
{
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "指定されたレッスンが見つかりません"
  }
}

// ページネーション（従来のページ指定方式）
{
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}

// 無限スクロール（offset/limit方式）
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 主要エンティティ

```
users ─────┬──── sessions（匿名対応）
           │
           ├──── hearts（残機）
           │
           └──── learning_records（学習記録）
                      │
                      ├──── tsumeshogi_records（詰将棋詳細）
                      │
                      ├──── lesson_records（駒塾詳細）← 将来
                      │
                      └──── joseki_records（定跡詳細）← 将来
```

**ストリーク**: learning_recordsのcompletedDateから導出（テーブルなし）

---

## 将棋用語集

| 用語 | 読み | 説明 |
|------|------|------|
| SFEN | エスフェン | 局面を文字列で表現する形式 |
| 詰将棋 | つめしょうぎ | 王手の連続で詰ませるパズル |
| 定跡 | じょうせき | 序盤の決まった手順 |
| 戦型 | せんけい | 駒組みのパターン（矢倉、振り飛車等） |
| 手数 | てすう | 詰みまでの手の数 |
| 居飛車 | いびしゃ | 飛車を初期位置で使う戦法 |
| 振り飛車 | ふりびしゃ | 飛車を左側に移動させる戦法 |

---

## 現在の開発状況

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 15.5（完了） |
| 最終更新 | 2026-01-03 |
| 開発方針 | **機能単位で「モック画面 → API → 連携」を繰り返す** |

### Phase 15.5（完了）- アプリ側レッスンAPI連携

**目標**: アプリのレッスン画面をモックデータからAPIに切り替え

**実装内容:**
- [x] ユーザー向けレッスン取得API作成（バックエンド）
- [x] アプリ側APIクライアント関数追加
- [x] コース一覧画面をAPI連携に変更
- [x] セクション一覧画面をAPI連携に変更
- [x] レッスンプレイ画面をAPI連携に変更
- [x] モックデータ削除（型定義のみ残す）
- [x] 動作確認・テスト
- [x] 駒打ち対応（P*5e形式のSFEN手）
- [x] 複数手順対応（自分→相手→自分のシーケンス）
- [x] ストリーク画面遷移バグ修正
- [x] コース進捗率表示

**実装済みエンドポイント（ユーザー向け）:**
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/lesson/courses | コース一覧（進捗含む） | 必須 |
| GET | /api/lesson/courses/:courseId | コース詳細 | 必須 |
| GET | /api/lesson/lessons/:lessonId | レッスン詳細（問題含む） | 必須 |

### Phase 15（完了）- 管理画面レッスン管理

**目標**: レッスンのコンテンツ管理画面を実装

詳細設計:
- `docs/designs/admin-panel.md` - 管理画面全体設計
- `docs/designs/lesson-admin-ui.md` - レッスン管理UI設計

**技術スタック:**
- React + Vite + React Router + TailwindCSS

**実装内容:**
- [x] 管理画面プロジェクト初期化
- [x] レッスン管理UIモック（将棋盤、問題編集、一覧）
- [x] 管理者認証ミドルウェア
- [x] レッスンDBスキーマ（Course, Section, Lesson, LessonProblem）
- [x] レッスン管理API（CRUD + 並び替え）
- [x] レッスン管理UI（API連携）
- [x] コードレビュー指摘対応（MUST/SHOULD項目）

**実装済みエンドポイント（管理者用）:**
| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/admin/lesson/courses | コース一覧 |
| POST | /api/admin/lesson/courses | コース作成 |
| PUT | /api/admin/lesson/courses/:id | コース更新 |
| DELETE | /api/admin/lesson/courses/:id | コース削除 |
| PUT | /api/admin/lesson/courses/reorder | コース並び替え |
| POST | /api/admin/lesson/sections | セクション作成 |
| PUT | /api/admin/lesson/sections/:id | セクション更新 |
| DELETE | /api/admin/lesson/sections/:id | セクション削除 |
| PUT | /api/admin/lesson/sections/reorder | セクション並び替え |
| POST | /api/admin/lesson/lessons | レッスン作成 |
| PUT | /api/admin/lesson/lessons/:id | レッスン更新 |
| DELETE | /api/admin/lesson/lessons/:id | レッスン削除 |
| PUT | /api/admin/lesson/lessons/reorder | レッスン並び替え |
| GET | /api/admin/lesson/problems/:id | 問題詳細取得 |
| POST | /api/admin/lesson/problems | 問題作成 |
| PUT | /api/admin/lesson/problems/:id | 問題更新 |
| DELETE | /api/admin/lesson/problems/:id | 問題削除 |
| PUT | /api/admin/lesson/problems/reorder | 問題並び替え |

### Phase 14（完了）- 駒塾API連携

**目標**: レッスン機能を詰将棋と同様の新APIパターンに移行

詳細設計: `docs/designs/lesson-api.md`

- [x] LessonRecord, LessonProblemAttemptテーブル追加
- [x] POST /api/lesson/record エンドポイント追加
- [x] 問題ごとの詳細記録（isCorrect, usedHint, usedSolution）
- [x] 完了時間（completionSeconds）保存
- [x] 復習モードではAPI記録スキップ
- [x] 古いコード削除（useHeartsGate, useHeartsConsume, recordLearningCompletion）

**実装済みエンドポイント:**
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /api/lesson/record | レッスン学習記録 | 必須 |

### Phase 13（完了）- 学習API連携

**目標**: 詰将棋の学習記録をサーバーAPIに統合

詳細設計: `docs/designs/learning-record.md`

**実装内容:**
- [x] POST /api/tsumeshogi/record エンドポイント追加
- [x] サーバー側でハート消費・ストリーク計算
- [x] アプリAPI関数（recordTsumeshogi, getStreak）
- [x] saveStreakFromApi()でAsyncStorageキャッシュ更新
- [x] tsumeshogi/[id].tsx を新API呼び出しに変更
- [x] アプリ起動時にサーバーからストリーク同期
- [x] 将来削除予定のコードに@deprecated TODO追加

**実装済みエンドポイント:**
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/learning/streak | ストリーク状態取得 | 必須 |
| POST | /api/tsumeshogi/record | 詰将棋学習記録 | 必須 |

### Phase 12.5（完了）- 詰将棋アプリ-API連携

**目標**: 詰将棋画面をモックデータからAPIに切り替え

- [x] lib/api/tsumeshogi.ts 作成（getTsumeshogiList, getTsumeshogi）
- [x] 一覧画面をAPI連携に変更（キャッシュ、リトライ機能付き）
- [x] プレイ画面をAPI連携に変更
- [x] モックデータ削除
- [x] API呼び出し最適化（paramsでキャッシュデータ渡し）

**実装ファイル:**
```
packages/app/lib/api/
└── tsumeshogi.ts          # getTsumeshogiList(), getTsumeshogi()
```

### Phase 12（完了）- 詰将棋API

**目標**: 詰将棋問題データのAPI（GET）を実装

詳細設計: `docs/designs/tsumeshogi-api.md`

- [x] Prismaスキーマにtsumeshogisテーブル追加
- [x] マイグレーション実行
- [x] シードデータ作成・投入（既存モック13問）
- [x] tsumeshogi.repository.ts
- [x] tsumeshogi.service.ts（TDD）
- [x] tsumeshogi.router.ts
- [x] app.tsにルーター登録
- [x] フッター固定ボタン追加（やり直し↔次の問題へ切り替え）

**実装済みエンドポイント:**
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/tsumeshogi | 一覧取得（moveCountフィルタ対応） | 不要 |
| GET | /api/tsumeshogi/:id | 詳細取得 | 不要 |

### Phase 11.5（完了）- ハート機能 - アプリ-API連携

**目標**: ホーム画面のハート表示をAPIに接続し、詰将棋・レッスン完了時にハート消費

詳細設計: `docs/designs/hearts.md`

- [x] lib/api/hearts.ts 作成（getHearts, consumeHearts）
- [x] lib/hearts/heartsUtils.ts 作成（回復計算）
- [x] lib/hearts/useHearts.ts 作成（状態管理フック + 1分カウントダウン）
- [x] lib/hearts/useHeartsGate.ts 作成（開始時チェック + 完了時消費）
- [x] lib/hearts/useHeartsConsume.ts 作成（消費ロジック共通化）
- [x] lib/hearts/checkHeartsAvailable.ts 作成（残量チェック）
- [x] ホーム画面のハート表示をAPI連携
- [x] 詰将棋にハート消費機能を統合
- [x] レッスンにハート消費機能を統合
- [x] バックグラウンド復帰時の即座再計算（AppState監視）
- [x] 画面フォーカス時のAPIコール最適化（キャッシュ再計算）
- [x] コードレビュー指摘対応（MUST/SHOULD項目）

**実装ファイル:**
```
packages/app/lib/
├── api/
│   └── hearts.ts              # getHearts(), consumeHearts()
└── hearts/
    ├── heartsUtils.ts         # 回復計算（サーバーと同じロジック）
    ├── useHearts.ts           # 状態管理フック（1分更新、AppState監視）
    ├── useHeartsGate.ts       # 開始時チェック + 完了時消費の一括管理
    ├── useHeartsConsume.ts    # 消費ロジック共通化
    └── checkHeartsAvailable.ts # 残量チェック（アラート表示）
```

**設計ポイント:**
- 初回のみAPI取得、以降はキャッシュから再計算（APIコール削減）
- 回復計算はクライアント側で実行（1分ごとに表示更新）
- バックグラウンド復帰時にAppStateで即座再計算
- ハート消費失敗時は完了扱いにしない（不正防止）
- 詰将棋: 正解時に消費 + 次問題遷移前にcheckAvailable()
- レッスン: 最終問題完了時にonComplete()で消費

### Phase 11（完了）- ハートAPI

**目標**: ハートシステム（残機）のバックエンドAPIを実装

詳細設計: `docs/designs/hearts.md`

- [x] Prismaスキーマのデフォルト値を10に変更
- [x] エラーコード確認（NO_HEARTS_LEFT既存）
- [x] Zodスキーマ作成
- [x] Heartsリポジトリ実装
- [x] Heartsサービス実装（TDD）
- [x] Heartsルーター実装
- [x] テスト実行・動作確認（52件パス）

**実装済みエンドポイント:**
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/hearts | ハート状態取得 | 必須 |
| POST | /api/hearts/consume | ハート消費 | 必須 |

**設計ポイント（manabi-shogiの教訓）:**
- 取得時はDB更新なし（新規ユーザーの初回を除く）
- 回復計算はクライアント側で実行（APIコール削減）
- 消費時のみDB更新
- 1時間で1ハート回復、最大10ハート

**ファイル構成:**
```
packages/api/src/modules/hearts/
├── hearts.router.ts        # エンドポイント
├── hearts.service.ts       # ビジネスロジック
├── hearts.service.test.ts  # サービステスト（12件）
├── hearts.repository.ts    # DBアクセス
└── hearts.schema.ts        # Zodスキーマ
```

### Phase 10（完了）- 本番デプロイ（Railway）

**目標**: 本番環境をRailwayで構築し、アプリからAPIを利用可能にする

詳細設計: `docs/designs/deployment.md`

- [x] Dockerfile作成（マルチステージビルド）
- [x] .dockerignore作成
- [x] Railway設定（GUI操作）
  - アカウント作成
  - プロジェクト作成（Asia-Southeast: Singapore）
  - PostgreSQL追加（Singapore）
  - GitHub連携
  - 環境変数設定
- [x] 初回デプロイ確認
- [x] アプリ側のAPI URL更新
- [x] 動作確認

**本番環境:**
| 項目 | 値 |
|------|-----|
| API URL | `https://komaneko-production.up.railway.app` |
| リージョン | シンガポール（API・DB共に） |
| レスポンス時間 | 280-450ms |

### Phase 9（完了）- 認証機能 - アプリ-API連携

**目標**: アプリのモック認証を実際のAPIに接続

詳細設計: `docs/designs/auth.md`

- [x] APIクライアント設定（fetch）
- [x] 新規登録のAPI連携
- [x] ログインのAPI連携
- [x] ログアウトのAPI連携
- [x] アカウント削除のAPI連携
- [x] トークン管理（SecureStore / AsyncStorageフォールバック）
- [x] エラーハンドリングUI
- [x] ローディング状態UI
- [x] バリデーション共通化（@komaneko/shared）

**実装ファイル:**
```
packages/app/lib/
├── api/
│   ├── config.ts      # API設定（BASE_URL）
│   ├── client.ts      # fetch wrapper、エラーハンドリング
│   └── auth.ts        # 認証API関数
└── auth/
    ├── tokenStorage.ts   # JWT保存（SecureStore/AsyncStorage）
    ├── authStorage.ts    # 認証状態保存
    └── AuthContext.tsx   # 認証コンテキスト

packages/shared/src/validation/
└── auth.ts            # 共通バリデーションルール
```

### Phase 8（完了）- 認証機能 - API

**目標**: バックエンドの認証APIを実装

詳細設計: `docs/designs/auth.md`

- [x] Userモデルに認証フィールド追加（email, username, passwordHash）
- [x] 認証ユーティリティ（JWT, パスワードハッシュ）
- [x] 認証サービス（register, login, logout, getCurrentUser, deleteAccount）
- [x] 認証リポジトリ（Prismaによるデータアクセス）
- [x] 認証ミドルウェア（JWT + DBセッション二重検証）
- [x] preHandlerフックによるデフォルト認証（PUBLIC_ROUTES例外パターン）
- [x] 保護エンドポイント（/logout, /me, DELETE /me）
- [x] レースコンディション対策（Prisma P2002エラーハンドリング）
- [x] ユニットテスト（40件）

**実装済みエンドポイント:**
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /api/auth/register | 新規登録 | 不要 |
| POST | /api/auth/login | ログイン | 不要 |
| POST | /api/auth/logout | ログアウト | 必須 |
| GET | /api/auth/me | ユーザー情報取得 | 必須 |
| DELETE | /api/auth/me | アカウント削除 | 必須 |

### Phase 7（完了）- 認証機能 - アプリUI

**目標**: アプリ起動時のウェルカム画面とログイン/新規登録のモック実装

詳細設計: `docs/designs/auth.md`

- [x] 認証状態管理（AsyncStorage + AuthContext）
- [x] ウェルカム画面（splash.png背景 + ボタン）
- [x] ログイン画面（モック認証）
- [x] 新規登録画面（モック登録）
- [x] ルートレイアウト修正（Redirectパターンによる認証フロー）
- [x] 入力バリデーション（validation.ts）

### Phase 6（完了）- ストリーク更新画面

詳細設計: `docs/designs/streak.md`

### Phase 5（完了）- 駒塾画面

詳細設計: `docs/designs/lesson.md`

### Phase 4（完了）- 詰将棋画面

詳細設計: `docs/designs/tsumeshogi-logic.md`

### Phase 3（完了）- 将棋盤共通コンポーネント

```
packages/app/
├── components/shogi/    # ShogiBoard, Piece, PieceStand
├── lib/shogi/           # types, sfen, perspective, pieceImages
├── mocks/tsumeshogiData.ts
└── assets/images/pieces/
```

**重要**: `perspective.ts` で先手/後手視点の切り替えを集約（manabi-shogiの教訓）

### Phase 2（完了）- アプリ基盤 + ホーム画面
### Phase 1（完了）- API基盤
### Phase 0（完了）- ドキュメント

---

## 設計判断の背景

### なぜこの技術スタックか
- **Node.js**: 情報量最多、AIの学習データ豊富
- **Fastify**: Express並の情報量 + 高速
- **Prisma**: 型安全、AIが詳しい、ドキュメント充実

### なぜレイヤー構造を厳守するか
前身プロジェクト（manabi-shogi）で発生した問題を防ぐため：
- 複雑性の増大 → レイヤー分離で責務を明確化
- 統一感のなさ → 全モジュールで同じパターンを強制
- スパゲッティコード → 一方向依存でクリーンな構造を維持

### なぜYAGNIを重視するか
- 初期から複雑な構成にすると保守コストが増大
- 必要になってから追加する方が適切な設計ができる
- Redis、Sentry、Swagger等は後から追加で十分

---

## 注意事項

### やるべきこと
- 既存のパターンに従う
- Service層・将棋ロジックはTDD（テスト先行）
- 1機能 = 1コミット、ユーザー許可を得てからコミット

### やってはいけないこと
- レイヤーを飛ばした呼び出し
- raw SQL（Prismaのみ使用）
- 認可チェックなしのデータアクセス
- ユーザー許可なしのコミット

---

## 参照ファイル

### 常に参照
- `.cursorrules` - 開発ルール
- `CLAUDE.md` - このファイル
- `docs/ROADMAP.md` - 開発計画書

### 実装時に参照（manabi-shogiから移植時）
- `/Users/maikishinbo/Projects/manabi_shogi_web/manabi-shogi-backend/prisma/schema.prisma`
- `/Users/maikishinbo/Projects/manabi_shogi_web/manabi-shogi-backend/src/utils/SfenProcessor.ts`
