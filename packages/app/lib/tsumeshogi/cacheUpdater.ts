/**
 * 詰将棋キャッシュ更新ユーティリティ
 *
 * ステータス更新をキャッシュに反映するロジックを分離し、テスト可能にする。
 */

import type { TsumeshogiProblem } from '@/lib/api/tsumeshogi'

/** ステータスフィルタの型 */
export type StatusFilter = 'all' | 'unsolved' | 'in_progress' | 'solved'

/** ステータス更新の型 */
export interface StatusUpdate {
  id: string
  status: TsumeshogiProblem['status']
}

/** キャッシュエントリの型 */
export interface CacheEntry {
  problems: TsumeshogiProblem[]
  hasMore: boolean
  lastProblemNumber: number
}

/** キャッシュの型 */
export type ProblemsCache = {
  [key: string]: CacheEntry | undefined
}

/**
 * ステータス更新をキャッシュに反映する
 *
 * @param cache 現在のキャッシュ
 * @param updates ステータス更新リスト
 * @returns 更新されたキャッシュ
 */
export function applyStatusUpdatesToCache(
  cache: ProblemsCache,
  updates: StatusUpdate[],
): ProblemsCache {
  if (updates.length === 0) return cache

  const newCache = { ...cache }

  // まず全キャッシュから問題データを収集（新しいフィルタキャッシュに追加するため）
  const problemDataMap = collectProblemDataMap(cache)

  // 各キャッシュエントリを更新
  for (const [key, entry] of Object.entries(newCache)) {
    if (!entry) continue

    const updatedEntry = updateCacheEntry(key, entry, updates, problemDataMap)
    if (updatedEntry !== entry) {
      newCache[key] = updatedEntry
    }
  }

  return newCache
}

/**
 * 全キャッシュエントリから問題データのMapを作成
 */
function collectProblemDataMap(cache: ProblemsCache): Map<string, TsumeshogiProblem> {
  const map = new Map<string, TsumeshogiProblem>()

  for (const entry of Object.values(cache)) {
    if (!entry) continue
    for (const problem of entry.problems) {
      if (!map.has(problem.id)) {
        map.set(problem.id, problem)
      }
    }
  }

  return map
}

/**
 * 単一のキャッシュエントリを更新
 */
function updateCacheEntry(
  key: string,
  entry: CacheEntry,
  updates: StatusUpdate[],
  problemDataMap: Map<string, TsumeshogiProblem>,
): CacheEntry {
  // キャッシュキーからmoveCountとステータスフィルタを抽出
  const [moveCountStr, statusFilter] = key.split('-') as [string, StatusFilter]
  const moveCount = Number(moveCountStr)

  let hasChanges = false

  // 既存問題のステータス更新
  let updatedProblems = updateProblemStatuses(entry.problems, updates)
  if (updatedProblems !== entry.problems) {
    hasChanges = true
  }

  // ステータスフィルタに基づいてフィルタリング
  if (statusFilter !== 'all') {
    const filtered = filterByStatus(updatedProblems, statusFilter)
    if (filtered.length !== updatedProblems.length) {
      hasChanges = true
      updatedProblems = filtered
    }

    // 新しくフィルタ条件に合う問題を追加
    const added = addMatchingProblems(
      updatedProblems,
      updates,
      statusFilter,
      moveCount,
      entry.lastProblemNumber,
      problemDataMap,
    )
    if (added.length > updatedProblems.length) {
      hasChanges = true
      updatedProblems = added.sort((a, b) => a.problemNumber - b.problemNumber)
    }
  }

  if (!hasChanges) return entry

  return {
    ...entry,
    problems: updatedProblems,
  }
}

/**
 * 問題リストのステータスを更新
 */
function updateProblemStatuses(
  problems: TsumeshogiProblem[],
  updates: StatusUpdate[],
): TsumeshogiProblem[] {
  let hasChanges = false
  const updated = problems.map((problem) => {
    const update = updates.find((u) => u.id === problem.id)
    if (update && problem.status !== update.status) {
      hasChanges = true
      return { ...problem, status: update.status }
    }
    return problem
  })
  return hasChanges ? updated : problems
}

/**
 * ステータスフィルタに合わない問題を除外
 */
function filterByStatus(
  problems: TsumeshogiProblem[],
  statusFilter: StatusFilter,
): TsumeshogiProblem[] {
  return problems.filter((problem) => problem.status === statusFilter)
}

/**
 * 新しくフィルタ条件に合う問題を追加
 */
function addMatchingProblems(
  currentProblems: TsumeshogiProblem[],
  updates: StatusUpdate[],
  statusFilter: StatusFilter,
  moveCount: number,
  lastProblemNumber: number,
  problemDataMap: Map<string, TsumeshogiProblem>,
): TsumeshogiProblem[] {
  const result = [...currentProblems]
  const existingIds = new Set(currentProblems.map((p) => p.id))

  for (const update of updates) {
    // このフィルタに合うステータスかチェック
    if (update.status !== statusFilter) continue

    // 問題データを取得
    const problemData = problemDataMap.get(update.id)
    if (!problemData) continue

    // 手数が一致するかチェック
    if (problemData.moveCount !== moveCount) continue

    // 既にリストに含まれているかチェック
    if (existingIds.has(update.id)) continue

    // 読み込み済み範囲内かチェック（lastProblemNumber以下）
    if (problemData.problemNumber > lastProblemNumber) continue

    // 追加
    result.push({ ...problemData, status: update.status })
    existingIds.add(update.id)
  }

  return result
}
