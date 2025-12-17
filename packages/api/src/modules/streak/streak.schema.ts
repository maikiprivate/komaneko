/**
 * ストリークAPI用Zodスキーマ
 */

/**
 * ストリーク状態レスポンス（GET /api/streak）
 */
export interface StreakResponse {
  currentCount: number
  longestCount: number
  lastActiveDate: string | null
  updatedToday: boolean
}

/**
 * ストリーク記録レスポンス（POST /api/streak/record）
 */
export interface RecordStreakResponse {
  updated: boolean
  currentCount: number
  longestCount: number
}
