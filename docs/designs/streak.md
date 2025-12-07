# ストリーク（連続学習）機能設計

## 概要

Duolingo風のフルスクリーン演出で、その日の最初の学習完了時にストリーク更新を祝うUI。

## 要件

| 項目 | 内容 |
|------|------|
| 表示タイミング | その日の最初の学習完了後 |
| 対象 | レッスンと詰将棋の両方（将来の拡張にも対応） |
| 表示方法 | 画面遷移（モーダルではない） |
| 遷移先 | 表示後、元の画面に戻る |
| UI | Duolingo風フルスクリーン |
| データ管理 | AsyncStorageでローカル保存 |
| ホーム連携 | 更新後、ホーム画面のストリークカードを反映 |

## 画面フロー

```
学習完了（レッスン/詰将棋/将来の機能）
       ↓
recordLearningCompletion() を呼び出し
       ↓
 [その日の最初か判定]
       ↓
  YES → { updated: true, newCount: N } を返す
  NO  → { updated: false } を返す
       ↓
updated === true の場合
       ↓
router.push('/streak-update?count=N')
       ↓
ストリーク更新画面表示 → 「続ける」タップ → router.back()
```

## 設計方針

### 1. 柔軟な統合パターン

各画面から直接ストリークロジックを呼ぶのではなく、**共通関数**を用意：

```typescript
// どの画面からも呼べる共通関数
const result = await recordLearningCompletion()

if (result.updated) {
  router.push(`/streak-update?count=${result.newCount}`)
}
```

**メリット**:
- 新しい学習コンテンツ追加時も同じパターンで統合可能
- ストリークロジックの変更が1箇所で済む

### 2. 画面遷移

**ルート**: `/streak-update`

パラメータ:
- `count`: 更新後のストリーク数

### 3. ホーム画面のストリーク更新

`useFocusEffect` でフォーカス時にAsyncStorageから再読み込み。

## データモデル

```typescript
interface StreakData {
  currentCount: number      // 現在の連続日数
  longestCount: number      // 最長記録
  lastActiveDate: string | null  // 最終学習日 (YYYY-MM-DD)
}
```

## ストリーク判定ロジック

```typescript
// 今日すでに学習済み → 更新なし
if (lastActiveDate === today) return { updated: false }

// 昨日も学習 → ストリーク継続
if (lastActiveDate === yesterday) newCount = currentCount + 1

// それ以外 → リセット
else newCount = 1
```

## UI構成

```
+----------------------------------+
|                                  |
|      🔥 (火のアイコン/アニメ)    |
|                                  |
|          [ 3 ] 日連続！          |
|                                  |
|     今日も頑張ったにゃ！         |
|     この調子で続けるにゃ〜       |
|                                  |
|        🐱 (キャラクター)         |
|                                  |
|  ┌────────────────────────────┐  |
|  │         続ける             │  |
|  └────────────────────────────┘  |
|                                  |
+----------------------------------+
```

## ファイル構成

```
packages/app/
├── app/
│   └── streak-update.tsx         # ストリーク更新画面
├── lib/
│   └── streak/
│       ├── streakStorage.ts      # AsyncStorageユーティリティ
│       └── recordLearningCompletion.ts  # 学習完了記録関数
```

## 将来拡張

### マイルストーン対応

```typescript
const MILESTONES = [7, 30, 100, 365]

// streak-update.tsx でマイルストーン判定
const isMilestone = MILESTONES.includes(streakCount)
```

7日、30日等の節目で特別な演出を追加予定。
