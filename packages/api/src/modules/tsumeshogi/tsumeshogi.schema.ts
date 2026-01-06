/**
 * 詰将棋API用Zodスキーマ
 */

import { z } from 'zod'

/** ステータスフィルタ（クエリパラメータ用） */
export const statusFilterValues = ['all', 'unsolved', 'in_progress', 'solved'] as const
export type StatusFilter = (typeof statusFilterValues)[number]

/**
 * 一覧取得クエリパラメータ
 */
export const tsumeshogiQuerySchema = z.object({
  moveCount: z.coerce.number().int().optional(),
  /** ステータスでフィルタ。デフォルトは全件 */
  statusFilter: z.enum(statusFilterValues).default('all'),
  /** 無限スクロール用。初期表示・追加読み込み共に50件 */
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /**
   * カーソル: この問題番号より後の問題を取得
   * - 未指定時は先頭から取得
   * - 0を指定すると先頭から取得（problemNumber > 0 で全件対象）
   * - 例: afterNumber=50 で問題51以降を取得
   */
  afterNumber: z.coerce.number().int().min(0).optional(),
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
  problemNumber: number
  status: TsumeshogiStatus
}

/**
 * ページネーション情報（カーソルベース）
 */
export interface PaginationInfo {
  total: number
  limit: number
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
