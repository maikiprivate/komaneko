/**
 * 詰将棋API関数
 */

import { ApiError } from './client'
import { apiRequest } from './client'
import { API_BASE_URL } from './config'
import { getToken } from '../auth/tokenStorage'

/** 詰将棋ステータス */
export type TsumeshogiStatus = 'solved' | 'in_progress' | 'unsolved'

/** 詰将棋問題 */
export interface TsumeshogiProblem {
  id: string
  sfen: string
  moveCount: number
  problemNumber: number
  status: TsumeshogiStatus
}

/** ページネーション情報（カーソルベース） */
export interface PaginationInfo {
  total: number
  limit: number
  hasMore: boolean
}

/** 一覧取得レスポンス */
export interface TsumeshogiListResponse {
  problems: TsumeshogiProblem[]
  pagination: PaginationInfo
}

/** ステータスフィルタ */
export type StatusFilter = 'all' | 'unsolved' | 'in_progress' | 'solved'

/** 一覧取得オプション */
export interface GetTsumeshogiListOptions {
  moveCount?: number
  statusFilter?: StatusFilter
  limit?: number
  /** カーソル: この問題番号より後の問題を取得 */
  afterNumber?: number
}

/**
 * 詰将棋一覧を取得（カーソルベースページネーション）
 */
export async function getTsumeshogiList(
  options: GetTsumeshogiListOptions = {}
): Promise<TsumeshogiListResponse> {
  const { moveCount, statusFilter, limit, afterNumber } = options
  const params = new URLSearchParams()

  if (moveCount !== undefined) params.append('moveCount', String(moveCount))
  if (statusFilter !== undefined) params.append('statusFilter', statusFilter)
  if (limit !== undefined) params.append('limit', String(limit))
  if (afterNumber !== undefined) params.append('afterNumber', String(afterNumber))

  const query = params.toString() ? `?${params.toString()}` : ''
  const url = `${API_BASE_URL}/api/tsumeshogi${query}`

  const token = await getToken()
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    const json = await response.json()
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || 'エラーが発生しました'
    )
  }

  const json = await response.json()
  return {
    problems: json.data,
    pagination: json.pagination,
  }
}

/**
 * 詰将棋詳細を取得
 *
 * @param id 問題ID
 */
export async function getTsumeshogi(id: string): Promise<TsumeshogiProblem> {
  return apiRequest<TsumeshogiProblem>(`/api/tsumeshogi/${id}`)
}

/** 学習記録リクエスト */
export interface RecordTsumeshogiRequest {
  tsumeshogiId: string
  isCorrect: boolean
}

/** 学習記録レスポンス */
export interface RecordTsumeshogiResponse {
  // 正解時のみハート情報が返る（不正解時はnull）
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

/**
 * 詰将棋の学習記録を送信
 *
 * ハート消費・ストリーク更新はサーバー側で処理される。
 *
 * @param request 問題IDと正解/不正解
 */
export async function recordTsumeshogi(
  request: RecordTsumeshogiRequest,
): Promise<RecordTsumeshogiResponse> {
  return apiRequest<RecordTsumeshogiResponse>('/api/tsumeshogi/record', {
    method: 'POST',
    body: request,
  })
}
