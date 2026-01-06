/**
 * 詰将棋問題リストのモジュールレベルキャッシュ
 *
 * 一覧画面から詳細画面への遷移時に、URLパラメータの代わりにこのキャッシュを使用する。
 * URLパラメータ経由でJSONデータを渡すとURL長制限に達するリスクがあるため。
 */

import type { TsumeshogiProblem } from '@/lib/api/tsumeshogi'

interface ProblemsListCache {
  /** 手数 */
  moveCount: number
  /** 問題一覧 */
  problems: TsumeshogiProblem[]
  /** キャッシュ作成時刻 */
  timestamp: number
}

/** キャッシュの有効期限（5分） */
const CACHE_TTL_MS = 5 * 60 * 1000

/** モジュールレベルのキャッシュ */
let cache: ProblemsListCache | null = null

/**
 * 問題リストをキャッシュに保存
 */
export function setProblemsListCache(moveCount: number, problems: TsumeshogiProblem[]): void {
  cache = {
    moveCount,
    problems,
    timestamp: Date.now(),
  }
}

/**
 * キャッシュから問題リストを取得
 * @param moveCount 手数（キャッシュの手数と一致しない場合はnull）
 * @returns 問題リスト（キャッシュがない、期限切れ、手数不一致の場合はnull）
 */
export function getProblemsListCache(moveCount: number): TsumeshogiProblem[] | null {
  if (!cache) return null
  if (cache.moveCount !== moveCount) return null
  if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
    cache = null
    return null
  }
  return cache.problems
}

/**
 * 指定IDの問題をキャッシュから取得
 */
export function getProblemFromCache(id: string): TsumeshogiProblem | null {
  if (!cache) return null
  if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
    cache = null
    return null
  }
  return cache.problems.find((p) => p.id === id) ?? null
}

/**
 * キャッシュ内の問題のステータスを更新
 */
export function updateProblemStatusInCache(id: string, status: TsumeshogiProblem['status']): void {
  if (!cache) return
  const problem = cache.problems.find((p) => p.id === id)
  if (problem) {
    problem.status = status
  }
}

/**
 * キャッシュをクリア
 */
export function clearProblemsListCache(): void {
  cache = null
}
