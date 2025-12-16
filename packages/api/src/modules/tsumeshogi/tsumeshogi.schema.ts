/**
 * 詰将棋API用Zodスキーマ
 */

import { z } from 'zod'

/**
 * 一覧取得クエリパラメータ
 */
export const tsumeshogiQuerySchema = z.object({
  moveCount: z.coerce.number().int().optional(),
})

export type TsumeshogiQuery = z.infer<typeof tsumeshogiQuerySchema>

/**
 * 詰将棋レスポンス
 */
export interface TsumeshogiResponse {
  id: string
  sfen: string
  moveCount: number
}

/**
 * 一覧レスポンス
 */
export interface TsumeshogiListResponse {
  data: TsumeshogiResponse[]
  meta: { timestamp: string }
}

/**
 * 詳細レスポンス
 */
export interface TsumeshogiDetailResponse {
  data: TsumeshogiResponse
  meta: { timestamp: string }
}
