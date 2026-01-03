/**
 * 詰将棋API用Zodスキーマ
 */

import { z } from 'zod'

/**
 * 一覧取得クエリパラメータ
 */
export const tsumeshogiQuerySchema = z.object({
  moveCount: z.coerce.number().int().optional(),
  /** 無限スクロール用。初期表示・追加読み込み共に50件 */
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type TsumeshogiQuery = z.infer<typeof tsumeshogiQuerySchema>

/**
 * 詰将棋ステータス
 *
 * - solved: 正解済み
 * - in_progress: 挑戦済みだが未正解
 * - unsolved: 未挑戦（マップに存在しない場合のデフォルト値）
 */
export type TsumeshogiStatus = 'solved' | 'in_progress' | 'unsolved'

/**
 * 詰将棋レスポンス
 */
export interface TsumeshogiResponse {
  id: string
  sfen: string
  moveCount: number
  status: TsumeshogiStatus
}

/**
 * ページネーション情報
 */
export interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

/**
 * 一覧レスポンス
 */
export interface TsumeshogiListResponse {
  data: TsumeshogiResponse[]
  pagination: PaginationInfo
  meta: { timestamp: string }
}

/**
 * 詳細レスポンス
 */
export interface TsumeshogiDetailResponse {
  data: TsumeshogiResponse
  meta: { timestamp: string }
}

/**
 * 学習記録リクエスト
 */
export const recordTsumeshogiSchema = z.object({
  tsumeshogiId: z.string().min(1, '問題IDは必須です'),
  isCorrect: z.boolean(),
})

export type RecordTsumeshogiInput = z.infer<typeof recordTsumeshogiSchema>
