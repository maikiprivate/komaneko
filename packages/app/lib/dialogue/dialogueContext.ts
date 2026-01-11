/**
 * 駒猫セリフシステム - コンテキスト判定
 */

import type { TimeOfDay, UserContext } from './types'

/**
 * 現在の時間帯を取得
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours()

  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * 2つの日付の差を日数で計算
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 日付が今日かどうか判定
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * ユーザーコンテキストを構築
 */
export function buildUserContext(params: {
  streakDays?: number
  lastVisitDate?: Date | null
  recentAccuracy?: number
  currentHearts?: number
  maxHearts?: number
}): UserContext {
  const now = new Date()
  const {
    streakDays = 0,
    lastVisitDate,
    recentAccuracy,
    currentHearts,
    maxHearts,
  } = params

  // 最終訪問からの日数を計算
  let daysAbsent = 0
  let isFirstVisitToday = true
  if (lastVisitDate) {
    daysAbsent = getDaysDifference(lastVisitDate, now)
    isFirstVisitToday = !isToday(lastVisitDate)
  }

  return {
    timeOfDay: getTimeOfDay(now),
    streakDays,
    daysAbsent,
    isFirstVisitToday,
    recentAccuracy,
    currentHearts,
    maxHearts,
  }
}
