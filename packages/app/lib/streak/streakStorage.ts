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
 * ストリークデータをリセット（テスト用）
 */
export async function resetStreakData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STREAK_STORAGE_KEY)
  } catch (error) {
    console.error('[streakStorage] Failed to reset streak data:', error)
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

/**
 * YYYY-MM-DD形式の文字列をローカル時間のDateにパース
 */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export interface DayProgress {
  date: number
  completed: boolean
}

export interface WeeklyStreakInfo {
  weeklyProgress: DayProgress[]
  todayIndex: number
  currentStreak: number
}

/**
 * ストリークデータから週間進捗情報を計算
 */
export function calculateWeeklyProgress(streakData: StreakData): WeeklyStreakInfo {
  const today = new Date()
  const todayString = formatDateString(today)
  const dayOfWeek = today.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  // 月曜始まりに変換 (0=月曜, 6=日曜)
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // 今週の月曜日を取得
  const monday = new Date(today)
  monday.setDate(today.getDate() - todayIndex)

  // 完了日のセットを作成（lastActiveDateから遡ってcurrentCount日分）
  const completedDates = new Set<string>()
  if (streakData.lastActiveDate && streakData.currentCount > 0) {
    const lastActive = parseDateString(streakData.lastActiveDate)
    for (let i = 0; i < streakData.currentCount; i++) {
      const completedDate = new Date(lastActive)
      completedDate.setDate(lastActive.getDate() - i)
      completedDates.add(formatDateString(completedDate))
    }
  }

  const weeklyProgress: DayProgress[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dateString = formatDateString(date)

    // 未来でなく、完了日セットに含まれていれば完了
    const completed = dateString <= todayString && completedDates.has(dateString)

    weeklyProgress.push({
      date: date.getDate(),
      completed,
    })
  }

  return {
    weeklyProgress,
    todayIndex,
    currentStreak: streakData.currentCount,
  }
}
