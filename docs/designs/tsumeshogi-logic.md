# 詰将棋ロジック設計

## 概要

詰将棋プレイ画面にゲームロジックを追加し、実際に駒を動かして問題を解けるようにする。

## 設計方針

### 正解判定アプローチ

事前定義の手順と比較するのではなく、**詰み判定ロジック**で正解を判断する。

```
1. ユーザーが駒を動かす
2. 王手かチェック
   - 王手でない → 不正解
3. 相手の玉が最善手で逃げる（AI）
4. 玉が逃げられない（詰み） → 正解！
5. 玉が逃げた → 次のユーザーの手番へ
```

これにより複数の正解手順を自然にサポートできる。

### 不正解時の挙動

1. ×フィードバック表示
2. 盤面リセット

## 実装ステップ

### Step 1: 駒の移動ロジック（基盤）✅ 完了

**ファイル:** `packages/app/lib/shogi/moveGenerator.ts`

```typescript
// 駒の移動パターン定義
const PIECE_MOVES = { ... }

// 各駒の移動可能位置を計算
function getPossibleMoves(board, position, piece): Position[]

// 持ち駒の打ち込み可能位置
function getDropPositions(board, pieceType, player): Position[]

// 駒を移動して新しい盤面を返す
function makeMove(boardState, from, to, promote?): BoardState

// 成り判定
function canPromote(pieceType, from, to, player): boolean
function mustPromote(pieceType, to, player): boolean
```

**実装済み:**
- 歩、香、桂、銀、金、角、飛、王
- 成駒（と、成香、成桂、成銀、馬、龍）
- 二歩禁止
- 行き場のない駒の禁止

### Step 2: ゲームフック（基本構造）✅ 完了

**ファイル:** `packages/app/hooks/useShogiBoard.ts`, `useTsumeshogiGame.ts`

現在の実装は仮実装。Step 3 で `useTsumeshogiGame` を全面書き換えする。

### Step 3: 王手・詰み判定ロジック 🔄 作業中

#### ファイル構成の再設計

コードレビューにより、以下の問題を発見し再設計を実施：

**問題点:**
1. `checkmate.ts` の `getPromotionOptions` と `moveGenerator.ts` の `canPromote`/`mustPromote` でロジック重複
2. `checkmate.ts` に共通ロジックと詰将棋専用ロジックが混在
3. ファイル名（checkmate）と内容（王手、合法手、AI応手）が一致しない

**新ファイル構成:**
```
lib/shogi/
├── types.ts           # 型定義（Move型含む）
├── moveGenerator.ts   # 駒の移動 + getPromotionOptions, applyMove
├── rules.ts           # 将棋ルール（共通）★ checkmate.tsをリネーム
└── pieceValue.ts      # 駒の評価値（共通）★ 新規

hooks/
└── useTsumeshogiGame.ts  # 詰将棋専用（AI応手含む）
```

#### アーキテクチャ変更

**重要:** `useTsumeshogiGame` は `useShogiBoard` を使用しない設計に変更。

**理由:**
- useShogiBoard は「実行 → コールバック」設計
- 詰将棋は「検証 → 実行」の順序が必須
- コールバック連携は複雑になりスパゲッティ化リスクあり

**新設計（検証先行パターン）:**
```
handleCellPress(row, col)
  │
  ├─ 選択モード: 駒を選択 → possibleMoves 計算 → return
  │
  └─ 移動モード: 移動先選択
       │
       ├─ 1. 仮盤面を作成: newState = makeMove(boardState, from, to)
       │
       ├─ 2. 王手チェック: isCheck(newState.board, 'gote')
       │     └─ No → onIncorrect() → reset() → return
       │
       ├─ 3. 詰みチェック: isCheckmate(newState, 'gote')
       │     └─ Yes → setBoardState(newState) → onCorrect() → return
       │
       └─ 4. AI応手:
             ├─ setGamePhase('ai_thinking')
             ├─ evasion = getBestEvasion(newState)
             ├─ afterAI = applyMove(newState, evasion)
             └─ setBoardState(afterAI)
```

#### 各ファイルの責務

**moveGenerator.ts（追加あり）:**
```typescript
// 既存（維持）
getPossibleMoves, getDropPositions, makeMove, makeDrop
canPromote, mustPromote, promote, unpromote

// 追加
function getPromotionOptions(pieceType, from, to, player): boolean[]
function applyMove(boardState, move): BoardState
```

**rules.ts（checkmate.ts からリネーム）:**
```typescript
// 王の位置を取得
function findKing(board, player): Position | null

// 王手かどうかを判定
function isCheck(board, player): boolean

// 合法手（自玉を王手にさらさない手）を全て列挙
function getAllLegalMoves(boardState, player): Move[]

// 詰みかどうかを判定
function isCheckmate(boardState, player): boolean

// 打ち歩詰めチェック
function isDropPawnMate(boardState, to, player): boolean
```

**pieceValue.ts（新規）:**
```typescript
export const PIECE_VALUES: Record<PieceType, number> = { ... }
export function getPieceValue(pieceType: PieceType): number
```

**useTsumeshogiGame.ts（AI応手を含む）:**
```typescript
// AI応手選択（詰将棋専用）
function getBestEvasion(boardState: BoardState): Move | null
function getMoveScore(boardState: BoardState, move: Move): number
```

**相手の応手ロジック（重要）:**

無駄な合駒をしないように、以下の優先順位で応手を選択：

1. **玉の移動** - 安全なマスへ逃げる
2. **攻め駒を取る** - 王手している駒を取れる場合
3. **有効な合駒** - 合駒で王手を防ぐ

```typescript
function getMoveScore(boardState, move): number {
  if (move.type === 'move') {
    const piece = boardState.board[move.from.row][move.from.col]
    // 玉の移動は最優先
    if (piece?.type === 'ou') return 1000
    // 攻め駒を取る
    const target = boardState.board[move.to.row][move.to.col]
    if (target) return 500 + getPieceValue(target.type)
    // 合駒
    return 100
  }
  // 持ち駒での合駒は低優先
  return 50
}
```

### Step 4: コンポーネントのタップ対応 ✅ 完了

**修正ファイル:**
- `packages/app/components/shogi/ShogiBoard.tsx` ✅
- `packages/app/components/shogi/PieceStand.tsx` ✅

**実装済みProps:**
```typescript
// ShogiBoard
onCellPress?: (row: number, col: number) => void
selectedPosition?: Position | null
possibleMoves?: Position[]

// PieceStand
onPiecePress?: (pieceType: PieceType) => void
selectedPiece?: PieceType | null
```

**スタイル:**
- 選択中マス: 黄色背景 ✅
- 移動可能マス: 薄緑背景 ✅

### Step 5: 画面統合 ✅ 完了

**ファイル:** `packages/app/app/tsumeshogi/[id].tsx`

**実装済み:**
- useTsumeshogiGame フックを統合
- やり直しボタンを接続
- 進行状況表示を動的に
- 正解/不正解フィードバック

### Step 6: 成りダイアログ ✅ 完了

- 成り/不成りの選択UI ✅
- 成れる場合にダイアログ表示 ✅
- 強制成りの場合は自動で成る ✅

## アーキテクチャ

### レイヤー構造

ロジックとUIを分離し、詰将棋専用フックは独立して状態管理を行う。

```
┌─────────────────────────────────────────────────────┐
│  画面（UI）                                          │
│  app/tsumeshogi/[id].tsx  │  app/lesson/[id].tsx   │
└─────────────────────────────────────────────────────┘
                      ↓ 使用
┌─────────────────────────────────────────────────────┐
│  ゲームフック（画面固有ロジック）                      │
├─────────────────────────────────────────────────────┤
│  useTsumeshogiGame.ts    │  useLessonGame.ts       │
│  - 全状態を自己管理       │  - useShogiBoard使用    │
│  - 詰み判定・AI応手       │  - 正解手順判定          │
│  - 検証先行パターン       │  - ヒント表示            │
│                          │  - 進捗管理              │
└─────────────────────────────────────────────────────┘
                      ↓ 使用
┌─────────────────────────────────────────────────────┐
│  共通フック（駒塾等で使用）                           │
│  useShogiBoard.ts                                   │
│  ※ 詰将棋では使用しない                              │
└─────────────────────────────────────────────────────┘
                      ↓ 使用
┌─────────────────────────────────────────────────────┐
│  純粋関数（lib/shogi/）                             │
│  moveGenerator.ts │ rules.ts │ pieceValue.ts など   │
└─────────────────────────────────────────────────────┘
```

### ファイル構成

```
hooks/
├── useShogiBoard.ts       # 共通: 盤面操作（駒塾等で使用）
├── useTsumeshogiGame.ts   # 詰将棋: 独立した状態管理 + AI応手
└── useLessonGame.ts       # 駒塾: useShogiBoard + 正解判定（将来）

lib/shogi/
├── types.ts               # 共通: 型定義（Move型含む）
├── moveGenerator.ts       # 共通: 駒の移動 + getPromotionOptions, applyMove
├── rules.ts               # 共通: 将棋ルール（王手・詰み判定）
├── pieceValue.ts          # 共通: 駒の評価値
├── sfen.ts                # 共通: SFEN解析
├── perspective.ts         # 共通: 視点変換
└── pieceImages.ts         # 共通: 駒画像
```

**依存関係:**
```
types.ts
    ↑
moveGenerator.ts ←─── rules.ts
    ↑                    ↑
pieceValue.ts ←──────────┤
                         ↑
              useTsumeshogiGame.ts
```

### 各レイヤーの責務

| レイヤー | 責務 | 例 |
|----------|------|------|
| 画面（UI） | 表示とユーザー操作の受付 | ボタン、レイアウト、アニメーション |
| ゲームフック | 画面固有のゲームルール | 詰み判定、正解判定、AI応手 |
| 共通フック | 盤面操作の共通処理（オプション） | 駒選択、移動、やり直し |
| 純粋関数 | 状態を持たない計算ロジック | 移動可能位置計算、王手判定 |

### 依存方向

- 上位レイヤーは下位レイヤーに依存してよい
- 下位レイヤーは上位レイヤーに依存してはならない
- 同一レイヤー内での依存は最小限に

## 設計原則

### 検証先行（Validate Before Execute）

```typescript
// 仮盤面で検証してから状態更新
const newState = makeMove(boardState, from, to, promote)
if (!isCheck(newState.board, 'gote')) {
  // 不正解: 状態は変更されていないのでリセットするだけ
  onIncorrect()
  reset()
  return
}
// 検証OK: 状態を反映
setBoardState(newState)
```

### 単一責任

- `moveGenerator.ts`: 駒の移動ロジック（純粋関数）
- `rules.ts`: 将棋ルール・詰み判定（純粋関数）
- `pieceValue.ts`: 駒の評価値（純粋関数）
- `useTsumeshogiGame`: 詰将棋の状態管理 + AI応手

### シンプルさの維持

- 詰将棋に必要な機能のみ実装
- 千日手、入玉判定は不要
- 状態管理はReact標準（useState）

### 座標系

- ゲームロジックは常に先手視点（row=0が一段目、col=0が9筋）
- 表示のみperspectiveで変換

## 修正ファイル一覧

| ファイル | 種類 | 内容 | 状態 |
|----------|------|------|------|
| `lib/shogi/types.ts` | 修正 | Move型追加 | ✅ 完了 |
| `lib/shogi/moveGenerator.ts` | 修正 | 駒の移動 + getPromotionOptions, applyMove | 🔄 作業中 |
| `lib/shogi/rules.ts` | リネーム | 将棋ルール（checkmate.tsから） | 🔄 作業中 |
| `lib/shogi/pieceValue.ts` | 新規 | 駒の評価値 | 🔄 作業中 |
| `hooks/useShogiBoard.ts` | 新規 | 共通盤面操作 | ✅ 完了 |
| `hooks/useTsumeshogiGame.ts` | 修正 | 詰将棋フック + AI応手 | 🔄 書き換え予定 |
| `components/shogi/ShogiBoard.tsx` | 修正 | タップ対応 | ✅ 完了 |
| `components/shogi/PieceStand.tsx` | 修正 | タップ対応 | ✅ 完了 |
| `app/tsumeshogi/[id].tsx` | 修正 | 統合 | ✅ 完了 |

## スコープ外

- ヒント機能
- 解答表示機能
- モックデータへの正解手順登録（詰み判定で代替）
