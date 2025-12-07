/**
 * 学習完了記録関数
 * どの学習コンテンツからも呼び出せる共通関数
 */

import {
  getStreakData,
  getTodayDateString,
  getYesterdayDateString,
  saveStreakData,
} from './streakStorage'

export interface LearningCompletionResult {
  /** ストリークが更新されたか（その日の最初の学習か） */
  updated: boolean
  /** 更新後のストリーク数 */
  newCount: number
}

/**
 * 学習完了を記録し、ストリーク更新が必要かを判定
 *
 * @example
 * ```typescript
 * const result = await recordLearningCompletion()
 * if (result.updated) {
 *   router.push(`/streak-update?count=${result.newCount}`)
 * }
 * ```
 */
export async function recordLearningCompletion(): Promise<LearningCompletionResult> {
  const streakData = await getStreakData()
  const today = getTodayDateString()

  // 今日すでに学習済みなら更新なし
  if (streakData.lastActiveDate === today) {
    return { updated: false, newCount: streakData.currentCount }
  }

  // ストリーク計算
  const yesterday = getYesterdayDateString()
  let newCount: number

  if (streakData.lastActiveDate === yesterday) {
    // 昨日も学習した → ストリーク継続
    newCount = streakData.currentCount + 1
  } else {
    // それ以外 → リセット（または初回）
    newCount = 1
  }

  // 保存
  await saveStreakData({
    currentCount: newCount,
    longestCount: Math.max(streakData.longestCount, newCount),
    lastActiveDate: today,
  })

  return { updated: true, newCount }
}
