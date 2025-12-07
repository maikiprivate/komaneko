/**
 * ストリーク（連続学習）データのAsyncStorageユーティリティ
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STREAK_STORAGE_KEY = '@komaneko/streak'

export interface StreakData {
  /** 現在の連続日数 */
  currentCount: number
  /** 最長記録 */
  longestCount: number
  /** 最終学習日 (YYYY-MM-DD形式、未学習の場合はnull) */
  lastActiveDate: string | null
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentCount: 0,
  longestCount: 0,
  lastActiveDate: null,
}

/**
 * ストリークデータを取得
 */
export async function getStreakData(): Promise<StreakData> {
  try {
    const json = await AsyncStorage.getItem(STREAK_STORAGE_KEY)
    if (json) {
      return JSON.parse(json) as StreakData
    }
    return DEFAULT_STREAK_DATA
  } catch {
    return DEFAULT_STREAK_DATA
  }
}

/**
 * ストリークデータを保存
 * @returns 保存成功時はtrue、失敗時はfalse
 */
export async function saveStreakData(data: StreakData): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('[streakStorage] Failed to save streak data:', error)
    return false
  }
}

/**
 * 今日の日付文字列を取得 (YYYY-MM-DD形式)
 */
export function getTodayDateString(): string {
  const now = new Date()
  return formatDateString(now)
}

/**
 * 昨日の日付文字列を取得 (YYYY-MM-DD形式)
 */
export function getYesterdayDateString(): string {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  return formatDateString(now)
}

/**
 * Dateを YYYY-MM-DD 形式にフォーマット
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
