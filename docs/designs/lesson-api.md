# Phase 14: 駒塾API連携

## 概要

レッスン機能を詰将棋と同様の新APIパターンに移行する。
- サーバー側でハート消費・ストリーク計算
- `@deprecated`マークした古いコードを削除

---

## 現状分析

### レッスンの現在の実装（旧パターン）

**lesson/[courseId]/[lessonId].tsx:**
- `useHeartsGate({ heartCost: 1 })` でハート管理
- 最終問題完了時に `heartsGate.consumeOnComplete()` でハート消費
- 内部で `POST /api/hearts/consume` を呼び出し

**lesson/result.tsx:**
- `recordLearningCompletion()` でローカルストリーク計算
- `updated: true` の場合に `/streak-update` へ遷移

### 詰将棋の新パターン（移行後）

**tsumeshogi/[id].tsx:**
- `useHearts()` でハート状態管理
- `recordTsumeshogi()` で直接API呼び出し
- `updateFromConsumeResponse()` でハート状態更新
- `saveStreakFromApi()` でストリークをAsyncStorageに保存

---

## 新規API設計

### POST /api/lesson/record

詰将棋と同じ設計を踏襲。

**リクエスト:**
```typescript
{
  lessonId: string,      // レッスンID
  isCorrect: boolean,    // 全問正解したか
  correctCount: number,  // 正解数
  totalCount: number,    // 総問題数
  completionTime: number // 完了時間（秒）
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
    } | null,  // isCorrect=true の時のみ
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

---

## 実装ステップ

### Step 1: API - lesson.schema.ts にスキーマ追加

**ファイル:** `packages/api/src/modules/lesson/lesson.schema.ts`（新規）

```typescript
import { z } from 'zod'

export const recordLessonSchema = z.object({
  lessonId: z.string().min(1, 'レッスンIDは必須です'),
  isCorrect: z.boolean(),
  correctCount: z.number().int().min(0),
  totalCount: z.number().int().min(1),
  completionTime: z.number().int().min(0),
})
```

### Step 2: API - lesson.router.ts に POST /record 追加

**ファイル:** `packages/api/src/modules/lesson/lesson.router.ts`（新規）

```typescript
// POST /api/lesson/record
app.post('/record', async (request, reply) => {
  const userId = getAuthenticatedUserId(request)
  const parseResult = recordLessonSchema.safeParse(request.body)
  // バリデーション...

  const { lessonId, isCorrect, correctCount, totalCount, completionTime } = parseResult.data

  // サーバー側でハート消費を決定（正解時のみ1ハート消費）
  const result = await learningService.recordCompletion(userId, {
    consumeHeart: isCorrect,
    contentType: 'lesson',
    contentId: lessonId,
    isCorrect,
  })

  return reply.send({
    data: {
      hearts: result.hearts ? {
        consumed: result.hearts.consumed,
        remaining: result.hearts.remaining,
        recoveryStartedAt: result.hearts.recoveryStartedAt.toISOString(),
      } : null,
      streak: result.streak,
      completedDates: result.completedDates,
    },
  })
})
```

### Step 3: API - app.ts にルーター登録

**ファイル:** `packages/api/src/app.ts`

```typescript
import { lessonRouter } from './modules/lesson/lesson.router.js'

// 既存のルーター登録に追加
app.register(lessonRouter, { prefix: '/api/lesson' })
```

### Step 4: アプリ - lesson.ts にAPI関数追加

**ファイル:** `packages/app/lib/api/lesson.ts`（新規）

```typescript
export interface RecordLessonRequest {
  lessonId: string
  isCorrect: boolean
  correctCount: number
  totalCount: number
  completionTime: number
}

export interface RecordLessonResponse {
  hearts: {
    consumed: number
    remaining: number
    recoveryStartedAt: string
  } | null
  streak: {
    currentCount: number
    longestCount: number
    updated: boolean
    isNewRecord: boolean
  }
  completedDates: string[]
}

export async function recordLesson(
  request: RecordLessonRequest
): Promise<RecordLessonResponse> {
  return apiRequest<RecordLessonResponse>('/api/lesson/record', {
    method: 'POST',
    body: request,
  })
}
```

### Step 5: アプリ - lesson/[courseId]/[lessonId].tsx 更新

**変更前:**
```typescript
import { useHeartsGate } from '@/lib/hearts/useHeartsGate'

const heartsGate = useHeartsGate({ heartCost: 1 })

const handleComplete = async () => {
  const success = await heartsGate.consumeOnComplete()
  if (success) {
    router.push('/lesson/result?...')
  }
}
```

**変更後:**
```typescript
import { useHearts } from '@/lib/hearts/useHearts'
import { checkHeartsAvailable } from '@/lib/hearts/checkHeartsAvailable'
import { recordLesson } from '@/lib/api/lesson'
import { saveStreakFromApi, getTodayDateString } from '@/lib/streak/streakStorage'

const { hearts, isLoading, error, updateFromConsumeResponse } = useHearts()

const handleComplete = async () => {
  // レッスン完了 = 常にtrue（部分正解でもストリーク更新）
  const isCorrect = true

  try {
    const result = await recordLesson({
      lessonId: lesson.id,
      isCorrect,
      correctCount,
      totalCount,
      completionTime,
    })

    // 正解時のみハート状態を更新
    if (result.hearts) {
      updateFromConsumeResponse(result.hearts)
    }

    // ストリークをAsyncStorageに保存
    const today = getTodayDateString()
    await saveStreakFromApi(result.streak, result.completedDates, today)

    // ストリーク更新画面への遷移
    if (result.streak.updated) {
      router.push(`/streak-update?count=${result.streak.currentCount}`)
    } else {
      router.push('/lesson/result?...')
    }
  } catch (error) {
    console.error('[Lesson] recordLesson failed:', error)
    // エラー時は結果画面に遷移（ハート消費失敗）
    router.push('/lesson/result?...')
  }
}
```

### Step 6: アプリ - lesson/result.tsx 更新

**変更前:**
```typescript
import { recordLearningCompletion } from '@/lib/streak/recordLearningCompletion'

useEffect(() => {
  const record = async () => {
    const result = await recordLearningCompletion()
    if (result.updated) {
      router.replace(`/streak-update?count=${result.newCount}`)
    }
  }
  record()
}, [])
```

**変更後:**
```typescript
// recordLearningCompletion() の呼び出しを削除
// ストリーク更新はPlayScreen側で既に処理済み
// result.tsxは単純に結果表示のみ
```

### Step 7: 古いコード削除

以下のファイル/関数を削除:

1. `packages/app/lib/streak/recordLearningCompletion.ts` - ファイル削除
2. `packages/app/lib/hearts/useHeartsGate.ts` - ファイル削除
3. `packages/app/lib/hearts/useHeartsConsume.ts` - ファイル削除
4. `packages/app/lib/api/hearts.ts` の `consumeHearts()` - 関数削除
5. `packages/api/src/modules/hearts/hearts.router.ts` の `POST /consume` - エンドポイント削除

---

## 変更ファイル一覧

### API側（新規/変更）
| ファイル | 変更内容 |
|---------|---------|
| `api/src/modules/lesson/lesson.schema.ts` | 新規: recordLessonSchema |
| `api/src/modules/lesson/lesson.router.ts` | 新規: POST /record 追加 |
| `api/src/app.ts` | lessonRouter登録 |

### API側（削除）
| ファイル | 変更内容 |
|---------|---------|
| `api/src/modules/hearts/hearts.router.ts` | POST /consume 削除 |
| `api/src/modules/hearts/hearts.schema.ts` | consumeHeartsSchema 削除（任意） |

### アプリ側（新規/変更）
| ファイル | 変更内容 |
|---------|---------|
| `app/lib/api/lesson.ts` | 新規: recordLesson() |
| `app/app/lesson/[courseId]/[lessonId].tsx` | useHearts + recordLesson() に変更 |
| `app/app/lesson/result.tsx` | recordLearningCompletion() 削除 |

### アプリ側（削除）
| ファイル | 変更内容 |
|---------|---------|
| `app/lib/streak/recordLearningCompletion.ts` | ファイル削除 |
| `app/lib/hearts/useHeartsGate.ts` | ファイル削除 |
| `app/lib/hearts/useHeartsConsume.ts` | ファイル削除 |
| `app/lib/api/hearts.ts` | consumeHearts() 削除 |

---

## 実装順序

1. **Step 1-3**: API側 - POST /api/lesson/record 実装
2. **Step 4**: アプリAPI関数 - recordLesson() 作成
3. **Step 5**: lesson/[courseId]/[lessonId].tsx - 新API呼び出しに変更
4. **Step 6**: lesson/result.tsx - 古いコード削除
5. **動作確認**
6. **Step 7**: 古いコード削除（useHeartsGate等）

---

## 注意事項

### レッスンと詰将棋の違い

| 項目 | 詰将棋 | レッスン |
|------|--------|---------|
| 問題数 | 1問 | 複数問題 |
| ハート消費タイミング | 正解時に即座 | 最終問題完了時 |
| isCorrect判定 | 1問の正解/不正解 | レッスン完了=true（常にtrue） |
| 不正解時のAPI呼び出し | あり（fire-and-forget） | なし（途中離脱時はAPI呼び出しなし） |

### ストリーク更新の条件

- **レッスン完了時に常にストリーク更新**（部分正解でもOK）
- `isCorrect: true` = レッスン完了フラグとして扱う
- 途中離脱の場合のみ `isCorrect: false`（API呼び出しなし）

---

## データフロー（実装後）

```
レッスン最終問題完了
    |
    v
recordLesson({
  lessonId: lesson.id,
  isCorrect: true,  // レッスン完了 = 常にtrue
  correctCount,
  totalCount,
  completionTime,
})
    |
    v
POST /api/lesson/record
    |
    v
API: LearningRecord作成 + ハート消費（正解時のみ） + ストリーク計算
    |
    v
レスポンス: {hearts, streak, completedDates}
    |
    +---> updateFromConsumeResponse(): ハート状態更新（正解時のみ）
    |
    +---> saveStreakFromApi(): AsyncStorage更新（キャッシュ）
    |
    +---> streak.updated ? -> ストリーク更新画面へ遷移
              +---> false -> 結果画面へ遷移
```

---

## テスト計画

### 手動テスト
1. レッスンを最後まで完了 -> ハート消費・ストリーク更新確認
2. 途中で離脱 -> ハート消費されないこと確認
3. 部分正解 -> ストリーク更新されること確認（レッスン完了=ストリーク更新）
4. オフライン時 -> エラーハンドリング確認

### 自動テスト（任意）
- lesson.router.ts のユニットテスト
- recordLesson() のモックテスト
