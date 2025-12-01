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

1. 相手が応手を指す（500ms待機）
2. ×フィードバック表示
3. 盤面リセット

## 実装ステップ

### Step 1: 駒の移動ロジック（基盤）✅ 完了

**新規ファイル:** `packages/app/lib/shogi/moveGenerator.ts`

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

**実装する駒の動き:**
- 歩、香、桂、銀、金、角、飛、王
- 成駒（と、成香、成桂、成銀、馬、龍）

**チェック項目:**
- 二歩禁止
- 行き場のない駒の禁止

### Step 2: ゲームフック（基本構造）

**新規ファイル:** `packages/app/hooks/useTsumeshogiGame.ts`

Step 4から前倒し。まず基本的な盤面操作を実装し、後からcheckmate.tsを統合する。

```typescript
function useTsumeshogiGame(problem, callbacks) {
  // 状態
  boardState          // 現在の盤面
  currentMoveCount    // 現在の手数
  selectedPosition    // 選択中のマス
  selectedCaptured    // 選択中の持ち駒
  possibleMoves       // 移動可能なマス
  isThinking          // 相手思考中フラグ

  // 操作
  handleCellPress(row, col)       // マスタップ
  handleCapturedPress(pieceType)  // 持ち駒タップ
  reset()                         // やり直し
}
```

### Step 3: 王手・詰み判定ロジック

**新規ファイル:** `packages/app/lib/shogi/checkmate.ts`

実装後、useTsumeshogiGameに統合する。

```typescript
// 王の位置を取得
function findKing(board, player): Position | null

// 王手かどうかを判定
function isCheck(board, player): boolean

// 王手を解除できる手を全て取得
function getCheckEvasionMoves(boardState): Move[]

// 詰みかどうかを判定
function isCheckmate(boardState): boolean

// 最善の応手を選択（AI）
function getBestEvasion(boardState): Move | null
```

**相手の応手ロジック（重要）:**

無駄な合駒をしないように、以下の優先順位で応手を選択：

1. **玉の移動** - 安全なマスへ逃げる
2. **攻め駒を取る** - 王手している駒を取れる場合
3. **有効な合駒** - 合駒で王手を防ぎ、かつ次の手で取られても状況が改善する場合のみ

```typescript
// 合駒が有効かどうかを判定
function isUsefulBlock(boardState, blockMove): boolean {
  // 合駒後の局面で、攻め方に取られた後も
  // 玉に逃げ道があるかをチェック
  // 単に1手延命するだけの合駒は無効とみなす
}
```

**無駄な合駒の例:**
- 3手詰めで合駒しても4手目で取られて結局詰む → 合駒しない
- 合駒しても次の王手に対応できない → 合駒しない

**ゲームフロー（checkmate.ts統合後）:**
```
handleCellPress
  ↓
駒選択 or 移動先選択
  ↓
移動実行 → makeMove()
  ↓
王手チェック → isCheck()
  ↓
詰みチェック → isCheckmate()
  ├─ 詰み → onCorrect()
  └─ 詰みでない → 相手の応手 → getBestEvasion()
       ├─ 逃げられる → 盤面更新、次のターン
       └─ 逃げられない（不正解） → onIncorrect() → reset()
```

### Step 4: コンポーネントのタップ対応

**修正ファイル:**
- `packages/app/components/shogi/ShogiBoard.tsx` ✅ 部分完了
- `packages/app/components/shogi/PieceStand.tsx`
- `packages/app/components/shogi/Piece.tsx`

**追加するProps:**
```typescript
// ShogiBoard ✅ 実装済み
onCellPress?: (row: number, col: number) => void
selectedPosition?: Position | null
possibleMoves?: Position[]

// PieceStand
onPiecePress?: (pieceType: PieceType) => void
selectedPiece?: PieceType | null

// Piece
isSelected?: boolean
```

**スタイル追加:**
- 選択中マス: 黄色背景 ✅
- 移動可能マス: 薄緑背景 ✅

### Step 5: 画面統合

**修正ファイル:** `packages/app/app/tsumeshogi/[id].tsx`

**実装内容:**
- useTsumeshogiGame フックを統合
- やり直しボタンを接続
- 進行状況表示を動的に（currentMoveCount使用）
- 相手思考中の表示（isThinking）

### Step 6: 成りダイアログ

- 成り/不成りの選択UI
- 成れる場合にダイアログ表示
- 強制成りの場合は自動で成る

## アーキテクチャ

### レイヤー構造

ロジックとUIを分離し、さらに共通ロジックと画面固有ロジックを分離する。

```
┌─────────────────────────────────────────────────────┐
│  画面（UI）                                          │
│  app/tsumeshogi/[id].tsx  │  app/lesson/[id].tsx   │
└─────────────────────────────────────────────────────┘
                      ↓ 使用
┌─────────────────────────────────────────────────────┐
│  ゲームフック（画面固有ロジック）                      │
│  useTsumeshogiGame.ts    │  useLessonGame.ts       │
│  - 詰み判定              │  - 正解手順判定          │
│  - AI応手                │  - ヒント表示            │
│  - 王手チェック           │  - 進捗管理              │
└─────────────────────────────────────────────────────┘
                      ↓ 使用
┌─────────────────────────────────────────────────────┐
│  共通フック（盤面操作）                               │
│  useShogiBoard.ts                                   │
│  - 駒の選択/移動                                    │
│  - 持ち駒の選択/打ち                                 │
│  - やり直し                                         │
└─────────────────────────────────────────────────────┘
                      ↓ 使用
┌─────────────────────────────────────────────────────┐
│  純粋関数（lib/shogi/）                             │
│  moveGenerator.ts │ checkmate.ts │ sfen.ts など     │
└─────────────────────────────────────────────────────┘
```

### ファイル構成

```
hooks/
├── useShogiBoard.ts       # 共通: 盤面操作の基本
├── useTsumeshogiGame.ts   # 詰将棋: useShogiBoard + 詰み判定
└── useLessonGame.ts       # 駒塾: useShogiBoard + 正解判定（将来）

lib/shogi/
├── moveGenerator.ts       # 共通: 駒の移動
├── checkmate.ts           # 詰将棋用: 詰み判定
├── sfen.ts                # 共通: SFEN解析
├── perspective.ts         # 共通: 視点変換
├── pieceImages.ts         # 共通: 駒画像
└── types.ts               # 共通: 型定義
```

### 各レイヤーの責務

| レイヤー | 責務 | 例 |
|----------|------|------|
| 画面（UI） | 表示とユーザー操作の受付 | ボタン、レイアウト、アニメーション |
| ゲームフック | 画面固有のゲームルール | 詰み判定、正解判定、AI応手 |
| 共通フック | 盤面操作の共通処理 | 駒選択、移動、持ち駒、やり直し |
| 純粋関数 | 状態を持たない計算ロジック | 移動可能位置計算、王手判定 |

### 依存方向

- 上位レイヤーは下位レイヤーに依存してよい
- 下位レイヤーは上位レイヤーに依存してはならない
- 同一レイヤー内での依存は最小限に

## 設計原則

### 実装アプローチ
- 実装先行（モック先行フェーズのため）
- テストは必要に応じて後から追加

### シンプルさの維持
- 詰将棋に必要な機能のみ実装
- 千日手、入玉判定は不要
- 状態管理はReact標準（useState/useReducer）

### ゲームロジックの分離
- ロジックは `lib/shogi/` 配下に純粋関数として実装
- UIとロジックを疎結合に

### 座標系
- ゲームロジックは常に先手視点（row=0が一段目、col=0が9筋）
- 表示のみperspectiveで変換

## 修正ファイル一覧

| ファイル | 種類 | 内容 |
|----------|------|------|
| `lib/shogi/moveGenerator.ts` | 新規 | 駒の移動ロジック |
| `lib/shogi/checkmate.ts` | 新規 | 王手・詰み判定 |
| `hooks/useTsumeshogiGame.ts` | 新規 | ゲームフック |
| `components/shogi/ShogiBoard.tsx` | 修正 | タップ対応 |
| `components/shogi/PieceStand.tsx` | 修正 | タップ対応 |
| `components/shogi/Piece.tsx` | 修正 | 選択表示 |
| `app/tsumeshogi/[id].tsx` | 修正 | 統合 |

## スコープ外

- ヒント機能
- 解答表示機能
- モックデータへの正解手順登録（詰み判定で代替）
