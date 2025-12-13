# ハートシステム設計書

## 課題

manabi-shogiでは「ハートを取得するタイミングが多くパフォーマンスが低下」した。

**問題の原因**:
- `getHeartsStatus()` が呼ばれるたびにDBから取得→回復計算→DB更新
- 取得だけなのに書き込みが発生（回復があればDB更新）
- ホーム画面表示、タブ切り替え時など頻繁にAPIが呼ばれる

---

## 解決策: ハイブリッド方式（BFF + クライアント計算）

### 設計原則

| 操作 | DB読み込み | DB書き込み | 回復計算 |
|------|-----------|-----------|---------|
| ハート取得 | ○ | ✗ | クライアント側 |
| ハート消費 | ○ | ○ | サーバー側 |

**ポイント**: 取得時はDB更新しない。消費時のみDB更新。

### フロー図

```
┌─────────────────────────────────────────────────────────────┐
│ ハート取得フロー（DBの生データを返すだけ）                    │
├─────────────────────────────────────────────────────────────┤
│ GET /api/hearts                                             │
│      ↓                                                      │
│ DB: SELECT count, maxCount, lastRefill FROM hearts          │
│      ↓                                                      │
│ レスポンス: { count: 3, maxCount: 10, lastRefill: "..." }   │
│      ↓                                                      │
│ クライアント: 回復計算して表示（例: 回復後10ハート）          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ハート消費フロー（DB更新あり）                               │
├─────────────────────────────────────────────────────────────┤
│ POST /api/hearts/consume { amount: 1 }                      │
│      ↓                                                      │
│ サーバー: 回復計算 → 消費 → DB更新                          │
│      ↓                                                      │
│ レスポンス: { consumed: 1, remaining: 9, lastRefill: "..." }│
└─────────────────────────────────────────────────────────────┘
```

---

## APIエンドポイント

### GET /api/hearts

ハート状態を取得（DB更新なし）

**呼び出しタイミング**:
- アプリ起動時（ログイン確認後）のみ
- ホーム画面表示時やタブ切り替え時はAPIを叩かない（ローカルキャッシュ + 内部計算）
- 消費APIのレスポンスで状態更新されるので、以降も内部計算で対応

**レスポンス**:
```typescript
{
  data: {
    count: number        // DB上の保存値
    maxCount: number     // 最大ハート数
    lastRefill: string   // 最後の補充時刻（ISO8601）
  }
}
```

### POST /api/hearts/consume

ハートを消費（唯一のDB更新ポイント）

**リクエスト**:
```typescript
{ amount: number }  // 通常は1
```

**レスポンス**:
```typescript
{
  data: {
    consumed: number     // 消費したハート数
    remaining: number    // 残りハート数（回復計算後）
    lastRefill: string   // 更新後のlastRefill
  }
}
```

**エラー**:
- `INSUFFICIENT_HEARTS`: ハートが足りない

---

## 回復メカニクス

| 項目 | 値 |
|------|-----|
| 最大ハート | 10 |
| 初期ハート | 10 |
| 回復間隔 | 1時間で1ハート |
| 全回復時間 | 10時間 |
| 回復計算 | `(現在時刻 - lastRefill) / 1時間` |

### 回復計算ロジック（サーバー・クライアント共通）

```typescript
function calculateCurrentHearts(hearts: { count: number; maxCount: number; lastRefill: Date }): number {
  const RECOVERY_INTERVAL_MS = 60 * 60 * 1000  // 1時間
  const msSinceRefill = Date.now() - hearts.lastRefill.getTime()
  const recovered = Math.floor(msSinceRefill / RECOVERY_INTERVAL_MS)
  return Math.min(hearts.count + recovered, hearts.maxCount)
}
```

---

## 実装ファイル

### 新規作成

| ファイル | 内容 |
|----------|------|
| `packages/api/src/modules/hearts/hearts.repository.ts` | DBアクセス |
| `packages/api/src/modules/hearts/hearts.service.ts` | ビジネスロジック |
| `packages/api/src/modules/hearts/hearts.service.test.ts` | サービステスト（TDD） |
| `packages/api/src/modules/hearts/hearts.router.ts` | エンドポイント |
| `packages/api/src/modules/hearts/hearts.schema.ts` | Zodスキーマ |
| `packages/api/src/shared/errors/errorCodes.ts` | エラーコード追加 |

### 参照ファイル

| ファイル | 参照内容 |
|----------|---------|
| `packages/api/prisma/schema.prisma` | Heartsモデル |
| `packages/api/src/modules/auth/auth.service.ts` | サービス層パターン |
| `packages/api/src/modules/auth/auth.router.ts` | ルーターパターン |

---

## Prismaスキーマ

```prisma
model Hearts {
  id        String   @id @default(uuid())
  userId    String   @unique @map("user_id")
  count     Int      @default(10)
  maxCount  Int      @default(10) @map("max_count")
  lastRefill DateTime @default(now()) @map("last_refill")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("hearts")
}
```

---

## 実装順序

1. **エラーコード追加** - `INSUFFICIENT_HEARTS`
2. **Zodスキーマ作成** - リクエスト/レスポンス型定義
3. **リポジトリ実装** - `findByUserId`, `upsert`
4. **サービス実装（TDD）** - 回復計算、消費ロジック
5. **ルーター実装** - エンドポイント登録
6. **テスト実行・動作確認**

---

## クライアント側（Phase 14で実装、今回は対象外）

- `packages/app/lib/hearts/heartsUtils.ts` - 回復計算（サーバーと同じロジック）
- `packages/app/lib/hearts/useHearts.ts` - 1分ごとに表示更新（APIは呼ばない）
- `packages/app/lib/api/hearts.ts` - API関数

---

## manabi-shogiとの比較

| 項目 | manabi-shogi | komaneko |
|------|-------------|----------|
| 取得時のDB更新 | あり（回復時） | なし |
| 回復計算の場所 | サーバーのみ | サーバー + クライアント |
| APIコール頻度 | 画面表示ごと | 消費時のみ |
| キャッシュ | 30分TTL | 不要（計算が軽い） |
