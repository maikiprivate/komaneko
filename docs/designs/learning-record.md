# 学習記録（LearningRecord）設計

## 概要

ストリーク（連続学習）機能を刷新し、Streakテーブルを廃止。
LearningRecord + コンテンツ別Recordで学習記録を管理する。
ストリークは学習記録から毎回導出する。

**スコープ**: API側のみ（アプリ連携は別フェーズ）

---

## 背景

### 旧設計（Streakテーブル）の問題

| 問題 | 詳細 |
|------|------|
| 派生データの保存 | `currentCount`, `longestCount` は元データではなく計算結果 |
| 週間カレンダー非対応 | 「どの日に学習したか」の情報がない |
| 学習履歴なし | 苦手分析、復習コンテンツに使えない |
| 拡張性低い | コンテンツ別の詳細記録ができない |

### 新設計の利点

| 利点 | 詳細 |
|------|------|
| 元データを保存 | 個別の学習イベントを記録 |
| 週間カレンダー対応 | `completedDate` から日付リスト取得可能 |
| 苦手分析対応 | 間違えた問題も記録 |
| 拡張性 | コンテンツ別Record（TsumeshogiRecord等）で詳細記録 |

---

## データ構造

```
LearningRecord（共通）
  ├── TsumeshogiRecord（詰将棋詳細）
  ├── LessonRecord（駒塾詳細）← 将来
  └── JosekiRecord（定跡詳細）← 将来
```

### 設計ポイント

- 全ての学習を `LearningRecord` に記録（正解・不正解問わず）
- `isCompleted` フラグで学習完了（ストリークにカウント）を判定
- `completedDate` は完了時のみ設定（ストリーク計算用）
- 苦手分析は全記録から、ストリークは完了のみから計算

### フィールドの意味

| テーブル | フィールド | 意味 |
|---------|-----------|------|
| LearningRecord | `isCompleted` | 学習が完了したか（ストリークにカウントするか） |
| TsumeshogiRecord | `isCorrect` | 問題に正解したか |

詰将棋では `isCorrect = true` → `isCompleted = true` だが、将来的に:
- レッスン: 全問正解しなくても最後まで進めば `isCompleted = true`
- 定跡: 一通り学習したら `isCompleted = true`

---

## Prismaスキーマ

```prisma
// ========== 学習記録 ==========

model LearningRecord {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  contentType   String    @map("content_type")  // "tsumeshogi" | "lesson" | "joseki"
  isCompleted   Boolean   @default(false) @map("is_completed")
  completedDate String?   @map("completed_date")  // "YYYY-MM-DD" (JST) 完了時のみ
  createdAt     DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // コンテンツ別詳細（1対1、どれか1つのみ紐づく）
  tsumeshogiRecord TsumeshogiRecord?

  @@index([userId, completedDate])
  @@index([userId, isCompleted])
  @@map("learning_records")
}

model TsumeshogiRecord {
  id               String   @id @default(uuid())
  learningRecordId String   @unique @map("learning_record_id")
  tsumeshogiId     String   @map("tsumeshogi_id")
  isCorrect        Boolean  @default(false) @map("is_correct")

  learningRecord LearningRecord @relation(fields: [learningRecordId], references: [id], onDelete: Cascade)

  @@index([tsumeshogiId])
  @@map("tsumeshogi_records")
}
```

---

## API設計

### POST /api/hearts/consume（既存拡張）

学習完了時にハート消費と学習記録を同時に行う。

**リクエスト**:
```typescript
{
  amount: number
  contentType?: "tsumeshogi" | "lesson"
  contentId?: string
  isCorrect?: boolean
}
```

**レスポンス**:
```typescript
{
  data: {
    consumed: number
    remaining: number
    recoveryStartedAt: string
    streak: {
      currentCount: number
      longestCount: number
      updated: boolean
      isNewRecord: boolean
    }
    completedDates: string[]  // 過去14日分
  }
}
```

### GET /api/learning/streak（新規）

ストリーク状態を取得（旧 `/api/streak` の代替）。

**レスポンス**:
```typescript
{
  data: {
    currentCount: number
    longestCount: number
    lastActiveDate: string | null
    updatedToday: boolean
    completedDates: string[]  // 過去14日分
  }
}
```

---

## ストリーク計算ロジック

```typescript
function calculateCurrentStreak(completedDates: string[], today: string): number {
  const yesterday = getYesterdayDateString(new Date(), JST_OFFSET_HOURS)

  // 今日も昨日も学習していない → 0
  if (!completedDates.includes(today) && !completedDates.includes(yesterday)) {
    return 0
  }

  // 連続日数をカウント
  let count = 0
  let checkDate = completedDates.includes(today) ? today : yesterday

  while (completedDates.includes(checkDate)) {
    count++
    checkDate = getPreviousDate(checkDate)
  }

  return count
}

function calculateLongestStreak(allDates: string[]): number {
  if (allDates.length === 0) return 0

  const sortedDates = [...allDates].sort()
  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    if (isConsecutiveDay(sortedDates[i - 1], sortedDates[i])) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}
```

---

## ファイル構成

```
packages/api/src/modules/learning/
├── learning.router.ts              # GET /api/learning/streak
├── learning.service.ts             # ビジネスロジック（既存を拡張）
├── learning.service.test.ts        # テスト
└── learning-record.repository.ts   # DBアクセス（新規）

packages/api/src/modules/hearts/
├── hearts.router.ts                # POST /api/hearts/consume（拡張）
└── hearts.schema.ts                # スキーマ（拡張）
```

---

## 移行手順

1. LearningRecord + TsumeshogiRecord テーブル作成
2. LearningRecordリポジトリ作成
3. LearningService書き換え（TDD）
4. hearts.schema.ts / hearts.router.ts 更新
5. GET /api/learning/streak 作成
6. Streakテーブル・モジュール削除
7. 動作確認・テスト

---

## 将来の拡張

### LessonRecord追加時

```prisma
model LessonRecord {
  id               String   @id @default(uuid())
  learningRecordId String   @unique
  lessonId         String
  // レッスン固有フィールド

  learningRecord LearningRecord @relation(...)
}
```

### 詳細フィールド追加時

機能実装に合わせて追加:
- `timeSpentMs` - 所要時間
- `hintUsed` - ヒント使用有無
- `answerViewed` - 解答表示有無

---

## 注意事項

- ストリーク計算は毎回LearningRecordを集計（インデックス付きクエリ）
- 既存AsyncStorageデータはAPIに移行されない（アプリ連携は別フェーズ）
- `isCorrect: false` の場合も記録は作成される（苦手分析用）
- 試行回数は同じ `tsumeshogiId` のレコード数から導出可能
