/**
 * ストリークサービス（ビジネスロジック）
 */

import {
  getDateString,
  getYesterdayDateString,
  dateToJSTString,
  JST_OFFSET_HOURS,
} from '@komaneko/shared/utils/date'
import type { StreakRepository } from './streak.repository.js'

interface GetStreakResult {
  currentCount: number
  longestCount: number
  lastActiveDate: string | null
  updatedToday: boolean
}

interface RecordResult {
  updated: boolean
  currentCount: number
  longestCount: number
}

export class StreakService {
  constructor(private repository: StreakRepository) {}

  /**
   * ストリーク状態を取得（DB更新なし）
   */
  async getStreak(userId: string): Promise<GetStreakResult> {
    const streak = await this.repository.findByUserId(userId)

    if (!streak) {
      // 新規ユーザー: デフォルト値を返す（DBには作成しない）
      return {
        currentCount: 0,
        longestCount: 0,
        lastActiveDate: null,
        updatedToday: false,
      }
    }

    const today = getDateString(new Date(), JST_OFFSET_HOURS)
    const lastActiveDateString = streak.lastActiveDate
      ? dateToJSTString(streak.lastActiveDate)
      : null

    return {
      currentCount: streak.currentCount,
      longestCount: streak.longestCount,
      lastActiveDate: lastActiveDateString,
      updatedToday: lastActiveDateString === today,
    }
  }

  /**
   * 学習完了を記録（ストリーク判定 → DB更新）
   */
  async recordStreak(userId: string): Promise<RecordResult> {
    const streak = await this.repository.findByUserId(userId)

    const today = getDateString(new Date(), JST_OFFSET_HOURS)
    const yesterday = getYesterdayDateString(new Date(), JST_OFFSET_HOURS)

    // 既存データがある場合
    if (streak) {
      const lastActiveDateString = streak.lastActiveDate
        ? dateToJSTString(streak.lastActiveDate)
        : null

      // 今日すでに記録済み → 更新なし
      if (lastActiveDateString === today) {
        return {
          updated: false,
          currentCount: streak.currentCount,
          longestCount: streak.longestCount,
        }
      }

      // ストリーク計算
      let newCount: number
      if (lastActiveDateString === yesterday) {
        // 昨日も学習 → ストリーク継続
        newCount = streak.currentCount + 1
      } else {
        // それ以外 → リセット
        newCount = 1
      }

      const newLongestCount = Math.max(streak.longestCount, newCount)

      // DB更新
      await this.repository.upsert(userId, {
        currentCount: newCount,
        longestCount: newLongestCount,
        lastActiveDate: new Date(),
      })

      return {
        updated: true,
        currentCount: newCount,
        longestCount: newLongestCount,
      }
    }

    // 新規ユーザー: 初回記録
    await this.repository.upsert(userId, {
      currentCount: 1,
      longestCount: 1,
      lastActiveDate: new Date(),
    })

    return {
      updated: true,
      currentCount: 1,
      longestCount: 1,
    }
  }
}
