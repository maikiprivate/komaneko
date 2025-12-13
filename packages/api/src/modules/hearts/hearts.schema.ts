/**
 * ハートAPI用Zodスキーマ
 */

import { z } from 'zod'

/**
 * ハート消費リクエスト
 */
export const consumeHeartsSchema = z.object({
  amount: z.number().int().min(1, '1以上の整数を指定してください'),
})

export type ConsumeHeartsInput = z.infer<typeof consumeHeartsSchema>

/**
 * ハート状態レスポンス（GET /api/hearts）
 */
export interface HeartsResponse {
  count: number
  maxCount: number
  lastRefill: string
}

/**
 * ハート消費レスポンス（POST /api/hearts/consume）
 */
export interface ConsumeHeartsResponse {
  consumed: number
  remaining: number
  lastRefill: string
}
