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
