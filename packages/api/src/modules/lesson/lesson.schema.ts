/**
 * レッスンAPI用Zodスキーマ
 */

import { z } from 'zod'

/**
 * レッスン完了記録リクエスト
 */
export const recordLessonSchema = z.object({
  lessonId: z.string().min(1, 'レッスンIDは必須です'),
  isCorrect: z.boolean(),
  correctCount: z.number().int().min(0),
  totalCount: z.number().int().min(1),
  completionTime: z.number().int().min(0),
})

export type RecordLessonInput = z.infer<typeof recordLessonSchema>
