/**
 * ハートAPI用Zodスキーマ
 */

import { z } from 'zod'

/**
 * ハート消費リクエスト
 */
export const consumeHeartsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(1, '1以上の整数を指定してください')
    .max(10, '10以下の整数を指定してください'),
  contentType: z.enum(['tsumeshogi', 'lesson']).optional(),
  contentId: z.string().optional(),
  isCorrect: z.boolean().optional(),
})

export type ConsumeHeartsInput = z.infer<typeof consumeHeartsSchema>

/**
 * ハート状態レスポンス（GET /api/hearts）
 */
export interface HeartsResponse {
  count: number
  maxCount: number
  recoveryStartedAt: string
}
