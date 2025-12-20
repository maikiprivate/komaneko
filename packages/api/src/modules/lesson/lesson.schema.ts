/**
 * レッスンAPI用Zodスキーマ
 */

import { z } from 'zod'

/**
 * 問題ごとの試行記録
 */
export const problemAttemptSchema = z.object({
  problemId: z.string().min(1, '問題IDは必須です'),
  problemIndex: z.number().int().min(0),
  isCorrect: z.boolean(),
  usedHint: z.boolean(),
  usedSolution: z.boolean(),
})

export type ProblemAttemptInput = z.infer<typeof problemAttemptSchema>

/**
 * レッスン完了記録リクエスト
 */
export const recordLessonSchema = z.object({
  lessonId: z.string().min(1, 'レッスンIDは必須です'),
  problems: z.array(problemAttemptSchema).min(1, '問題が必要です'),
  completionSeconds: z.number().int().min(0).optional(),
})

export type RecordLessonInput = z.infer<typeof recordLessonSchema>
