# 駒猫 - Claude Code 開発ガイド

このファイルは Claude Code がプロジェクトを理解するための参照情報です。
開発ルールは `.cursorrules` を参照してください。

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
    ├── ROADMAP.md        # 開発計画書
    └── CODING_STANDARDS.md  # 詳細な規約（Phase 1後に作成）
```

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

## 主要エンティティ

```
users ─────┬──── sessions（匿名対応）
           │
           ├──── hearts（残機）
           │
           ├──── streaks（連続記録）
           │
           └──── learning_records（学習記録）
                      │
                      ├──── lessons（駒塾）
                      │
                      └──── tsumeshogis（詰将棋）
```

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
| フェーズ | Phase 0（ドキュメント・設計基盤） |
| 最終更新 | 2025-11-25 |
| 作業中 | 基盤ドキュメント作成 |
| 次のタスク | Phase 1（プロジェクト基盤構築） |

### 完了済み
- [x] .cursorrules 作成
- [x] mise.toml 作成
- [x] CLAUDE.md 作成

### Phase 1 で実施予定
- [ ] モノレポ初期化（pnpm workspaces）
- [ ] 共通設定（biome.json, tsconfig）
- [ ] Docker Compose（PostgreSQL）
- [ ] Prismaセットアップ
- [ ] Fastifyアプリ基本構成
- [ ] ヘルスチェックエンドポイント

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
