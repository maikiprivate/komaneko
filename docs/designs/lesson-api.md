# Phase 14: 駒塾API連携

## 概要

レッスン機能のAPI連携を実装する。詰将棋と異なり、レッスンは複数問題で構成されるため、問題ごとの記録が必要。

### ユーザー要件（確定済み）

| 項目 | 決定内容 |
|------|---------|
| ログ粒度 | **詳細ログ**（ヒント・解答使用含む）- 問題ごとに記録 |
| 中断時の挙動 | **記録なし** - 完了時のみAPI呼び出し |
| 復習機能 | **後回し**（Phase 15）- ただし想定した設計にする |

---

## 現状分析

### レッスンの構造

```
Course（コース）
  └── Section（セクション）
        └── Lesson（レッスン）
              └── Problem（問題）× 複数
```

**問題の状態管理（useLessonGame.ts）:**
- `hasAttemptedWrong`: 現在の問題で間違えたか
- `correctCount`: 初回正解した問題数
- ヒント使用: `handleHint()` でハイライト表示
- 解答使用: `handleSolution()` で自動再生

### 現在の不足点

1. 問題ごとのログがDB保存されない
2. ヒント・解答使用の記録がない
3. 中断時のAPI呼び出しがない
4. 復習モードが「全問やり直し」のみ

---

## 新規DB設計

### LessonRecord（レッスン記録）

完了時のみ作成。シンプルな構造。

```prisma
model LessonRecord {
  id               String   @id @default(uuid())
  learningRecordId String   @unique @map("learning_record_id")
  lessonId         String   @map("lesson_id")      // モックデータのID
  correctCount     Int      @default(0) @map("correct_count")  // 初回正解数

  learningRecord LearningRecord @relation(...)
  problemAttempts LessonProblemAttempt[]

  @@index([lessonId])
  @@map("lesson_records")
}
```

### LessonProblemAttempt（問題ごとの記録）

1問題につき1レコード。復習モードで「間違えた問題のみ」を抽出するために使用。

```prisma
model LessonProblemAttempt {
  id             String   @id @default(uuid())
  lessonRecordId String   @map("lesson_record_id")
  problemId      String   @map("problem_id")       // モックデータの問題ID
  problemIndex   Int      @map("problem_index")    // 問題番号（0-indexed）
  isCorrect      Boolean  @map("is_correct")       // 初回正解したか（ヒント・解答なしで一発正解）
  usedHint       Boolean  @default(false) @map("used_hint")
  usedSolution   Boolean  @default(false) @map("used_solution")

  lessonRecord LessonRecord @relation(...)

  @@index([lessonRecordId])
  @@map("lesson_problem_attempts")
}
```

### 削除したフィールド

| フィールド | 削除理由 |
|-----------|---------|
| courseId | lessonIdからたどれる |
| status | 完了時のみ作成するため不要 |
| totalCount | Lessonから取得可能 |
| completionTime | 計測機能なし |
| attemptCount | シンプル化（復習モード実装時に再検討） |
| createdAt | LearningRecordのcreatedAtで代用 |

---

## API設計

### POST /api/lesson/record

レッスン完了時に一括送信。中断時はAPI呼び出しなし。

**リクエスト:**
```typescript
{
  lessonId: string,
  problems: Array<{
    problemId: string,
    problemIndex: number,
    isCorrect: boolean,      // 初回正解か（ヒント・解答なしで一発正解）
    usedHint: boolean,
    usedSolution: boolean,
  }>
}
```

**レスポンス:**
```typescript
{
  data: {
    hearts: {
      consumed: number,
      remaining: number,
      recoveryStartedAt: string,
    },
    streak: {
      currentCount: number,
      longestCount: number,
      updated: boolean,
      isNewRecord: boolean,
    },
    completedDates: string[],
  }
}
```

### GET /api/lesson/:lessonId/review（Phase 15で実装）

復習用の未正解問題一覧を取得。今回は実装しない。

---

## アプリ側のデータ構造

### 1. 内部状態（useLessonGame.ts）

レッスン中にメモリ上で保持するデータ構造。

```typescript
/** 問題ごとの試行記録（内部用） */
interface ProblemAttemptState {
  problemId: string
  problemIndex: number
  isCorrect: boolean       // 初回正解 && ヒント未使用 && 解答未使用
  usedHint: boolean
  usedSolution: boolean
}

// 既存の状態
const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
const [correctCount, setCorrectCount] = useState(0)        // 結果画面表示用
const [hasAttemptedWrong, setHasAttemptedWrong] = useState(false)  // 現在の問題で間違えたか

// 新規追加
const [usedHint, setUsedHint] = useState(false)            // 現在の問題でヒント使用したか
const [usedSolution, setUsedSolution] = useState(false)    // 現在の問題で解答使用したか
const [problemAttempts, setProblemAttempts] = useState<ProblemAttemptState[]>([])  // 全問題の記録
```

### 2. 状態遷移のタイミング

```
問題開始
│
├─ ヒントボタン押下 → usedHint = true
├─ 解答ボタン押下 → usedSolution = true
├─ 不正解 → hasAttemptedWrong = true
│
正解（次の問題へ）
│
├─ isCorrect = !hasAttemptedWrong && !usedHint && !usedSolution
├─ problemAttempts に追加
├─ correctCount += 1（isCorrect=true の場合）
│
├─ usedHint = false（リセット）
├─ usedSolution = false（リセット）
├─ hasAttemptedWrong = false（リセット）
│
次の問題へ...
│
最終問題完了
│
└─ onComplete(problemAttempts) → API送信
```

### 3. API送信データ（lib/api/lesson.ts）

完了時にAPIに送信するデータ構造。

```typescript
/** APIリクエスト */
export interface RecordLessonRequest {
  lessonId: string
  problems: ProblemAttemptInput[]
}

/** 問題ごとの記録（API用） */
export interface ProblemAttemptInput {
  problemId: string
  problemIndex: number
  isCorrect: boolean
  usedHint: boolean
  usedSolution: boolean
}

/** APIレスポンス */
export interface RecordLessonResponse {
  hearts: {
    consumed: number
    remaining: number
    recoveryStartedAt: string
  }
  streak: {
    currentCount: number
    longestCount: number
    updated: boolean
    isNewRecord: boolean
  }
  completedDates: string[]
}
```

### 4. onCompleteコールバックの変更

```typescript
// useLessonGame.ts

/** フックの引数 */
interface UseLessonGameOptions {
  courseId: string
  lessonId: string
  lesson: Lesson | undefined
  /** レッスン完了時のコールバック */
  onComplete?: (data: LessonCompletionData) => Promise<boolean>
}

/** 完了データ（変更後） */
export interface LessonCompletionData {
  correctCount: number        // 初回正解数（結果画面表示用）
  totalCount: number          // 総問題数
  problems: ProblemAttemptState[]  // 問題ごとの詳細
}
```

### 5. 使用例（[lessonId].tsx）

```typescript
const handleComplete = async (data: LessonCompletionData): Promise<boolean> => {
  try {
    const result = await recordLesson({
      lessonId,
      problems: data.problems.map(p => ({
        problemId: p.problemId,
        problemIndex: p.problemIndex,
        isCorrect: p.isCorrect,
        usedHint: p.usedHint,
        usedSolution: p.usedSolution,
      })),
    })

    // ハート状態更新
    updateFromConsumeResponse(result.hearts)

    // ストリーク保存
    await saveStreakFromApi(result.streak, result.completedDates, getTodayDateString())

    // ストリーク更新画面への遷移
    if (result.streak.updated) {
      router.push(`/streak-update?count=${result.streak.currentCount}`)
    }

    return true
  } catch (error) {
    // エラーハンドリング
    return false
  }
}
```

### 6. 中断時の挙動

```typescript
// ×ボタン押下時はAPI呼び出しなし
// メモリ上のデータは破棄される
router.back()
```

---

## 実装ステップ

### Step 1: Prismaスキーマ追加

`packages/api/prisma/schema.prisma` にLessonRecord, LessonProblemAttemptを追加

### Step 2: マイグレーション実行

```bash
cd packages/api
npx prisma migrate dev --name add_lesson_records
```

### Step 3: lesson.schema.ts 更新

新スキーマに対応したZodスキーマに更新

### Step 4: lesson.service.ts 作成（TDD）

レッスン記録のビジネスロジック:
- LearningRecord作成（contentType: 'lesson'）
- LessonRecord作成
- LessonProblemAttempt一括作成
- ハート消費・ストリーク更新（LearningService経由）

### Step 5: lesson.router.ts 更新

`POST /record` を新スキーマ対応に更新

### Step 6: アプリ - lib/api/lesson.ts 更新

新スキーマ対応のインターフェースに変更

### Step 7: アプリ - useLessonGame.ts 拡張

- `ProblemAttemptState` 型追加
- `problemAttempts` 状態追加
- `usedHint`, `usedSolution` 状態追加（問題ごと）
- ヒント・解答使用時のフラグ更新
- onCompleteに`problems`を渡す

### Step 8: アプリ - lesson/[courseId]/[lessonId].tsx 更新

- 完了時に問題詳細を送信
- handleCompleteを更新

### Step 9: 古いコード削除

- `useHeartsGate.ts` 削除
- `useHeartsConsume.ts` 削除
- `recordLearningCompletion.ts` 削除

---

## 変更ファイル一覧

### API側
| ファイル | 変更内容 |
|---------|---------|
| `prisma/schema.prisma` | LessonRecord, LessonProblemAttempt追加 |
| `modules/lesson/lesson.schema.ts` | 新スキーマに更新 |
| `modules/lesson/lesson.service.ts` | 新規: レッスン記録ロジック |
| `modules/lesson/lesson.router.ts` | POST /record 更新 |

### アプリ側
| ファイル | 変更内容 |
|---------|---------|
| `lib/api/lesson.ts` | 新インターフェース |
| `hooks/useLessonGame.ts` | problemAttempts, usedHint, usedSolution追加 |
| `app/lesson/[courseId]/[lessonId].tsx` | handleComplete更新 |
| `app/lesson/result.tsx` | recordLearningCompletion削除 |

### 削除
| ファイル |
|---------|
| `lib/hearts/useHeartsGate.ts` |
| `lib/hearts/useHeartsConsume.ts` |
| `lib/streak/recordLearningCompletion.ts` |

---

## データフロー

### レッスン完了時

```
最終問題正解
    │
    ▼
recordLesson({
  lessonId,
  problems: [
    { problemId, problemIndex, isCorrect, usedHint, usedSolution },
    ...
  ]
})
    │
    ▼
POST /api/lesson/record
    │
    ├──▶ LearningRecord作成（contentType: 'lesson', isCompleted: true）
    ├──▶ LessonRecord作成
    ├──▶ LessonProblemAttempt × N 作成
    ├──▶ ハート消費
    └──▶ ストリーク計算・更新
    │
    ▼
レスポンス: {hearts, streak, completedDates}
```

### 中断時

```
×ボタン押下
    │
    ▼
router.back()  // API呼び出しなし
```

---

## 注意事項

### isCorrectの定義

`isCorrect = true` の条件:
- 初回で正解（hasAttemptedWrong = false）
- ヒント未使用（usedHint = false）
- 解答未使用（usedSolution = false）

すべてを満たした場合のみ「完全正解」とする。

### 既存実装との整合性

現在の `useLessonGame.ts` には以下の状態がある:
- `correctCount`: 引き続き使用（結果画面表示用）
- `hasAttemptedWrong`: 引き続き使用（isCorrect判定に利用）

新規追加:
- `usedHint`: 問題ごとのヒント使用フラグ
- `usedSolution`: 問題ごとの解答使用フラグ
- `problemAttempts`: 完了時にAPIに送信するデータ

### 復習機能の実装方針（Phase 15）

Phase 14では基本的なログ記録のみ実装。復習機能は以下の方針:
1. `GET /api/lesson/:lessonId/review` でisCorrect=falseの問題ID取得
2. アプリ側でフィルタして表示
3. 詳細はPhase 15で検討

### 同じレッスンの複数挑戦

毎回新しいLearningRecord + LessonRecordを作成。
過去の記録は残るため、正答率の推移を分析可能。

---

## テスト計画

### 手動テスト
1. レッスン完了 → 問題詳細がDB保存されること
2. ヒント使用 → usedHint=trueで記録
3. 解答使用 → usedSolution=trueで記録
4. 中断 → API呼び出しなし、記録なし
5. ハート消費・ストリーク更新が正常に動作すること

### 自動テスト
- lesson.service.ts のユニットテスト（TDD）
- 正常系: 完了記録作成
- 異常系: バリデーションエラー
