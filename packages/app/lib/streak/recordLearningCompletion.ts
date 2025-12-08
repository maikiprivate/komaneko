/**
 * 学習完了記録関数
 * どの学習コンテンツからも呼び出せる共通関数
 */

import {
  COMPLETED_DATES_RETENTION_DAYS,
  formatDateString,
  getDemoToday,
  getStreakData,
  getTodayDateString,
  parseDateString,
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

  // デモモードの場合は仮の今日を使用
  const demoToday = await getDemoToday()
  const today = demoToday ?? getTodayDateString()
  const yesterday = getYesterdayFromDate(today)

  // 今日すでに学習済みなら更新なし
  if (streakData.lastActiveDate === today) {
    return { updated: false, newCount: streakData.currentCount }
  }

  // ストリーク計算
  let newCount: number

  if (streakData.lastActiveDate === yesterday) {
    // 昨日も学習した → ストリーク継続
    newCount = streakData.currentCount + 1
  } else {
    // それ以外 → リセット（または初回）
    newCount = 1
  }

  // completedDatesを更新（今日を追加し、14日以上前のデータを削除）
  const updatedCompletedDates = updateCompletedDates(streakData.completedDates, today)

  // 保存
  const saved = await saveStreakData({
    currentCount: newCount,
    longestCount: Math.max(streakData.longestCount, newCount),
    lastActiveDate: today,
    completedDates: updatedCompletedDates,
  })

  // 保存失敗時は更新なしとして扱う（UIでは正常動作を維持）
  if (!saved) {
    return { updated: false, newCount: streakData.currentCount }
  }

  return { updated: true, newCount }
}

/**
 * 指定した日付の前日を取得（YYYY-MM-DD形式）
 */
function getYesterdayFromDate(dateStr: string): string {
  const date = parseDateString(dateStr)
  date.setDate(date.getDate() - 1)
  return formatDateString(date)
}

/**
 * completedDatesを更新（今日を追加し、保持期間を超えたデータを削除）
 */
function updateCompletedDates(currentDates: string[], today: string): string[] {
  // 今日を追加
  const updatedDates = currentDates.includes(today)
    ? currentDates
    : [...currentDates, today]

  // 保持期間を超えたデータを削除（デモモードでも正しく動作するようtodayを基準にする）
  const cutoffDate = parseDateString(today)
  cutoffDate.setDate(cutoffDate.getDate() - COMPLETED_DATES_RETENTION_DAYS)
  const cutoffString = formatDateString(cutoffDate)

  return updatedDates.filter(date => date >= cutoffString)
}
