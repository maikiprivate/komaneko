# Phase 12: 詰将棋API 設計書

## 概要

詰将棋問題データのAPI（GET）を実装し、アプリのUI変更を行う。

## スコープ

### API側
- Tsumeshogiテーブル追加（最小限の構造）
- 一覧・詳細取得API
- シードデータ投入（既存モック13問）

### アプリ側
- ヒント・解答機能の削除（詰将棋のみ）
- フッターUIの変更（やり直し/次の問題へボタンの統合）

---

## 1. データ設計

### Prismaスキーマ

```prisma
model Tsumeshogi {
  id          String   @id @default(uuid())
  sfen        String   // 局面（SFEN形式）
  moveCount   Int      @map("move_count")  // 手数（3, 5, 7 など）
  status      String   @default("draft")   // draft, published, archived
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([moveCount, status])
  @@map("tsumeshogis")
}
```

### 設計判断

| 項目 | 判断 | 理由 |
|------|------|------|
| difficulty | なし | 一旦不要、必要になったら追加 |
| hint | なし | 正解手順があれば不要、今回は正解手順もなし |
| solution | なし | 正解判定は`isCheckmate()`で動的に行う |
| status | enum→String | Prismaのenumは変更時にマイグレーションが面倒 |

### 正解判定について

詰将棋の正解判定は、保存された解答データには依存しない。

- `isCheck()`: 王手かどうかを判定
- `isCheckmate()`: 詰みかどうかを判定

これらは盤面状態から動的に計算されるため、ユーザーが模範解答と異なるルート（別解）で詰ませても、正解として扱える。

---

## 2. API設計

### エンドポイント

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/tsumeshogi | 一覧取得 | 必須 |
| GET | /api/tsumeshogi/:id | 詳細取得 | 必須 |

### GET /api/tsumeshogi

**クエリパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| moveCount | number | 手数でフィルタ（3, 5, 7） |

**レスポンス:**
```json
{
  "data": [
    {
      "id": "uuid",
      "sfen": "7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1",
      "moveCount": 3
    }
  ],
  "meta": { "timestamp": "..." }
}
```

### GET /api/tsumeshogi/:id

**レスポンス:**
```json
{
  "data": {
    "id": "uuid",
    "sfen": "7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1",
    "moveCount": 3
  },
  "meta": { "timestamp": "..." }
}
```

---

## 3. UI変更（詰将棋画面）

### Before（現状）

```
┌─────────────────────────┐
│ 駒猫コメント              │
├─────────────────────────┤
│ 盤面                     │
├─────────────────────────┤
│ 3手目 / 3手詰め          │
├─────────────────────────┤
│ [次の問題へ →]（解答後有効）│ ← navigationArea
├─────────────────────────┤
│ (spacer)                │
├─────────────────────────┤
│ やり直し | ヒント | 解答   │ ← GameFooter
└─────────────────────────┘
```

### After（変更後）

```
┌─────────────────────────┐
│ 駒猫コメント              │
├─────────────────────────┤
│ 盤面                     │
├─────────────────────────┤
│ 3手目 / 3手詰め          │
├─────────────────────────┤
│ (spacer)                │
├─────────────────────────┤
│ [ やり直し ]  or  [次の問題へ →] │ ← 固定フッター
└─────────────────────────┘
```

### ボタンの状態変化

| 状態 | ボタン | 色 | 動作 |
|------|--------|-----|------|
| 解答前 | やり直し | グレー | `game.reset()` |
| 解答後（正解） | 次の問題へ | 緑 | 次の問題へ遷移 |

---

## 4. ファイル構成

### API側（新規）

```
packages/api/
├── prisma/
│   ├── schema.prisma              # Tsumeshogiモデル追加
│   ├── migrations/                # マイグレーション
│   └── seed.ts                    # シードデータ
└── src/
    └── modules/
        └── tsumeshogi/
            ├── tsumeshogi.router.ts       # エンドポイント
            ├── tsumeshogi.service.ts      # ビジネスロジック
            ├── tsumeshogi.service.test.ts # サービステスト
            ├── tsumeshogi.repository.ts   # DBアクセス
            └── tsumeshogi.schema.ts       # Zodスキーマ
```

### アプリ側（変更）

```
packages/app/
└── app/
    └── tsumeshogi/
        └── [id].tsx               # UI変更（GameFooter削除、ボタン統合）
```

---

## 5. 実装順序

### Step 1: データベース
- [ ] Prismaスキーマにtsumeshogisテーブル追加
- [ ] マイグレーション実行
- [ ] シードデータ作成・投入

### Step 2: API実装（TDD）
- [ ] tsumeshogi.repository.ts
- [ ] tsumeshogi.service.test.ts（テスト先行）
- [ ] tsumeshogi.service.ts
- [ ] tsumeshogi.schema.ts
- [ ] tsumeshogi.router.ts
- [ ] app.tsにルーター登録

### Step 3: UI変更
- [ ] `[id].tsx`からGameFooter削除
- [ ] フッター固定ボタン追加（やり直し/次の問題へ）
- [ ] ボタン状態の切り替えロジック

### Step 4: テスト・動作確認
- [ ] APIテスト実行
- [ ] curlでAPI動作確認
- [ ] アプリでUI動作確認

---

## 6. シードデータ

既存モックデータから13問を投入。全て`status: 'published'`で投入。

```typescript
const tsumeshogiProblems = [
  // 3手詰め（5問）
  { sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1', moveCount: 3, status: 'published' },
  { sfen: '8l/7sk/6ppp/9/9/9/9/9/9 b RG 1', moveCount: 3, status: 'published' },
  // ... 他3問

  // 5手詰め（4問）
  { sfen: '7nl/6Gbk/6ppp/9/9/9/9/9/9 b RS 1', moveCount: 5, status: 'published' },
  // ... 他3問

  // 7手詰め（3問）
  { sfen: '7nl/6skp/6p1p/9/9/9/9/9/9 b RB2G 1', moveCount: 7, status: 'published' },
  // ... 他2問
]
```

---

## 7. 将来の拡張

| Phase | 内容 |
|-------|------|
| Phase 15 | 管理者API（POST/PATCH/DELETE） |
| 将来 | ユーザー進捗（TsumeshogiProgress） |
| 将来 | AI解答生成（管理画面連携） |
| 将来 | solution/hint追加（解答再生機能復活） |
