/**
 * 学習完了記録関数
 * どの学習コンテンツからも呼び出せる共通関数
 */

import {
  getDemoToday,
  getStreakData,
  getTodayDateString,
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
  await saveStreakData({
    currentCount: newCount,
    longestCount: Math.max(streakData.longestCount, newCount),
    lastActiveDate: today,
    completedDates: updatedCompletedDates,
  })

  return { updated: true, newCount }
}

/**
 * 指定した日付の前日を取得（YYYY-MM-DD形式）
 */
function getYesterdayFromDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)
  return formatDate(date)
}

/**
 * completedDatesを更新（今日を追加し、14日以上前のデータを削除）
 */
function updateCompletedDates(currentDates: string[], today: string): string[] {
  // 今日を追加
  const updatedDates = currentDates.includes(today)
    ? currentDates
    : [...currentDates, today]

  // 14日以上前のデータを削除
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 14)
  const cutoffString = formatDate(cutoffDate)

  return updatedDates.filter(date => date >= cutoffString)
}

/**
 * Dateを YYYY-MM-DD 形式にフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
