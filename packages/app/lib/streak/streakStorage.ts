/**
 * ストリーク（連続学習）データのAsyncStorageユーティリティ
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STREAK_STORAGE_KEY = '@komaneko/streak'
const DEMO_TODAY_KEY = '@komaneko/demo-today'

export interface StreakData {
  /** 現在の連続日数 */
  currentCount: number
  /** 最長記録 */
  longestCount: number
  /** 最終学習日 (YYYY-MM-DD形式、未学習の場合はnull) */
  lastActiveDate: string | null
  /** 学習完了日の配列（過去14日分を保持、週間カレンダー表示用） */
  completedDates: string[]
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentCount: 0,
  longestCount: 0,
  lastActiveDate: null,
  completedDates: [],
}

/**
 * ストリークデータを取得
 */
export async function getStreakData(): Promise<StreakData> {
  try {
    const json = await AsyncStorage.getItem(STREAK_STORAGE_KEY)
    if (json) {
      const data = JSON.parse(json) as Partial<StreakData>
      // 古いデータ形式との互換性（completedDatesがない場合）
      return {
        currentCount: data.currentCount ?? 0,
        longestCount: data.longestCount ?? 0,
        lastActiveDate: data.lastActiveDate ?? null,
        completedDates: data.completedDates ?? [],
      }
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
 * デモデータを設定（テスト用）
 * ストリークが途切れた後に再開したシナリオ
 * 仮の今日を金曜日に設定し、月曜と木曜に学習したデータを作成
 */
export async function setDemoStreakData(): Promise<void> {
  const realToday = new Date()
  const dayOfWeek = realToday.getDay()
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // 今週の月曜日を取得
  const monday = new Date(realToday)
  monday.setDate(realToday.getDate() - todayIndex)

  // 仮の今日を金曜日（今週の月曜 + 4日）に設定
  const demoToday = new Date(monday)
  demoToday.setDate(monday.getDate() + 4)
  const demoTodayStr = formatDateString(demoToday)

  // 月曜日に学習
  const mondayStr = formatDateString(monday)

  // 木曜日に学習（ストリーク再開）
  const thursday = new Date(monday)
  thursday.setDate(monday.getDate() + 3)
  const thursdayStr = formatDateString(thursday)

  const demoData: StreakData = {
    currentCount: 1, // 木曜から再開したので1日
    longestCount: 3,
    lastActiveDate: thursdayStr,
    completedDates: [mondayStr, thursdayStr], // 月曜と木曜に学習
  }

  try {
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(demoData))
    // 仮の今日を保存
    await AsyncStorage.setItem(DEMO_TODAY_KEY, demoTodayStr)
  } catch (error) {
    console.error('[streakStorage] Failed to set demo data:', error)
  }
}

/**
 * デモ用の仮の今日を取得（テスト用）
 * 設定されていなければnullを返す
 */
export async function getDemoToday(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DEMO_TODAY_KEY)
  } catch {
    return null
  }
}

/**
 * デモ用の仮の今日をクリア（テスト用）
 */
export async function clearDemoToday(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEMO_TODAY_KEY)
  } catch (error) {
    console.error('[streakStorage] Failed to clear demo today:', error)
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
 * @param streakData ストリークデータ
 * @param overrideToday 仮の今日（YYYY-MM-DD形式、テスト用）
 */
export function calculateWeeklyProgress(
  streakData: StreakData,
  overrideToday?: string | null,
): WeeklyStreakInfo {
  const today = overrideToday ? parseDateString(overrideToday) : new Date()
  const todayString = formatDateString(today)
  const dayOfWeek = today.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  // 月曜始まりに変換 (0=月曜, 6=日曜)
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // 今週の月曜日を取得
  const monday = new Date(today)
  monday.setDate(today.getDate() - todayIndex)

  // completedDatesをSetに変換（高速検索用）
  const completedDatesSet = new Set(streakData.completedDates)

  const weeklyProgress: DayProgress[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dateString = formatDateString(date)

    // 未来でなく、完了日セットに含まれていれば完了
    const completed = dateString <= todayString && completedDatesSet.has(dateString)

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
