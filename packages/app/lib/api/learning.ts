/**
 * 学習API関数
 */

import { apiRequest } from './client'

/** ストリーク取得レスポンス */
export interface StreakResponse {
  currentCount: number
  longestCount: number
  lastActiveDate: string | null
  updatedToday: boolean
  completedDates: string[]
}

/**
 * ストリーク状態を取得
 *
 * アプリ起動時にサーバーと同期するために使用。
 */
export async function getStreak(): Promise<StreakResponse> {
  return apiRequest<StreakResponse>('/api/learning/streak')
}
