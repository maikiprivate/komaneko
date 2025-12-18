/**
 * 詰将棋API関数
 */

import { apiRequest } from './client'

/** 詰将棋問題 */
export interface TsumeshogiProblem {
  id: string
  sfen: string
  moveCount: number
}

/**
 * 詰将棋一覧を取得
 *
 * @param moveCount 手数でフィルタ（省略時は全件）
 */
export async function getTsumeshogiList(moveCount?: number): Promise<TsumeshogiProblem[]> {
  const query = moveCount !== undefined ? `?moveCount=${moveCount}` : ''
  return apiRequest<TsumeshogiProblem[]>(`/api/tsumeshogi${query}`)
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
