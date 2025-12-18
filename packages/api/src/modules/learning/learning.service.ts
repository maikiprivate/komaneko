/**
 * 学習完了サービス
 *
 * LearningRecord経由で学習記録を管理し、ストリークを毎回計算する。
 */

import {
  getDateString,
  getYesterdayDateString,
  JST_OFFSET_HOURS,
} from '@komaneko/shared/utils/date'
import { prisma } from '../../db/client.js'
import type { HeartsService } from '../hearts/hearts.service.js'
import type { LearningRecordRepository } from './learning-record.repository.js'

/** 過去何日分の完了日を返すか */
const COMPLETED_DATES_DAYS = 14

/** ストリーク結果 */
export interface StreakResult {
  currentCount: number
  longestCount: number
  updated: boolean
  isNewRecord: boolean
}

/** ハート結果 */
export interface HeartsResult {
  consumed: number
  remaining: number
  recoveryStartedAt: Date
}

/** 学習完了結果 */
export interface LearningCompletionResult {
  streak: StreakResult
  hearts: HeartsResult | null
  completedDates: string[]
}

/** ストリーク取得結果 */
export interface StreakData {
  currentCount: number
  longestCount: number
  lastActiveDate: string | null
  updatedToday: boolean
  completedDates: string[]
}

/** recordCompletion オプション */
export interface RecordCompletionOptions {
  consumeHeart: boolean
  heartAmount?: number
  contentType?: 'tsumeshogi' | 'lesson'
  contentId?: string
  isCorrect?: boolean
}

export class LearningService {
  constructor(
    private learningRecordRepository: LearningRecordRepository,
    private heartsService: HeartsService
  ) {}

  /**
   * 学習完了を記録（トランザクション）
   *
   * ハート消費 → 学習記録作成 → ストリーク計算
   */
  async recordCompletion(
    userId: string,
    options: RecordCompletionOptions
  ): Promise<LearningCompletionResult> {
    return prisma.$transaction(async (tx) => {
      const today = getDateString(new Date(), JST_OFFSET_HOURS)
      const isCorrect = options.isCorrect ?? true

      // 1. レコード作成前に今日の完了状況を確認（updated判定用）
      const completedDatesBeforeCreate =
        await this.learningRecordRepository.findCompletedDates(
          userId,
          COMPLETED_DATES_DAYS,
          tx
        )
      const hadCompletedToday = completedDatesBeforeCreate.includes(today)

      // 2. ハート消費（失敗時はトランザクション全体がロールバック）
      let heartsResult: HeartsResult | null = null
      if (options.consumeHeart) {
        const amount = options.heartAmount ?? 1
        const result = await this.heartsService.consumeHearts(userId, amount, tx)
        heartsResult = {
          consumed: result.consumed,
          remaining: result.remaining,
          recoveryStartedAt: result.recoveryStartedAt,
        }
      }

      // 3. LearningRecord作成
      const completedDate = isCorrect ? today : null
      if (options.contentType === 'tsumeshogi' && options.contentId) {
        await this.learningRecordRepository.createWithTsumeshogi(
          userId,
          {
            tsumeshogiId: options.contentId,
            isCorrect,
            completedDate,
          },
          tx
        )
      }

      // 4. ストリーク計算（レコード作成後の状態を取得）
      const completedDates =
        isCorrect && !hadCompletedToday
          ? [today, ...completedDatesBeforeCreate]
          : completedDatesBeforeCreate
      const allDates = await this.learningRecordRepository.findAllCompletedDates(
        userId,
        tx
      )

      const currentCount = calculateCurrentStreak(completedDates, today)
      const longestCount = calculateLongestStreak(allDates)

      // 今日初めて完了したか判定
      const updated = isCorrect && !hadCompletedToday

      // 最長記録を更新したか判定
      const isNewRecord =
        updated &&
        currentCount === longestCount &&
        currentCount > 1

      return {
        streak: {
          currentCount,
          longestCount,
          updated,
          isNewRecord,
        },
        hearts: heartsResult,
        completedDates,
      }
    })
  }

  /**
   * ストリーク状態を取得
   */
  async getStreak(userId: string): Promise<StreakData> {
    const today = getDateString(new Date(), JST_OFFSET_HOURS)

    const [completedDates, lastActiveDate, allDates] = await Promise.all([
      this.learningRecordRepository.findCompletedDates(
        userId,
        COMPLETED_DATES_DAYS
      ),
      this.learningRecordRepository.findLastCompletedDate(userId),
      this.learningRecordRepository.findAllCompletedDates(userId),
    ])

    const currentCount = calculateCurrentStreak(completedDates, today)
    const longestCount = calculateLongestStreak(allDates)
    const updatedToday = completedDates.includes(today)

    return {
      currentCount,
      longestCount,
      lastActiveDate,
      updatedToday,
      completedDates,
    }
  }
}

/**
 * 現在のストリーク（連続日数）を計算
 *
 * 今日または昨日から遡って連続している日数をカウント。
 * 今日も昨日も学習していない場合は0。
 */
function calculateCurrentStreak(
  completedDates: string[],
  today: string
): number {
  const yesterday = getYesterdayDateString(new Date(), JST_OFFSET_HOURS)

  // 今日も昨日も学習していない → 0
  if (!completedDates.includes(today) && !completedDates.includes(yesterday)) {
    return 0
  }

  // 連続日数をカウント
  let count = 0
  let checkDate = completedDates.includes(today) ? today : yesterday

  while (completedDates.includes(checkDate)) {
    count++
    checkDate = getPreviousDate(checkDate)
  }

  return count
}

/**
 * 最長ストリークを計算
 *
 * 全日付をソートして最長連続を計算。
 */
function calculateLongestStreak(allDates: string[]): number {
  if (allDates.length === 0) return 0

  const sortedDates = [...allDates].sort()
  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1]
    const currDate = sortedDates[i]
    if (prevDate && currDate && isConsecutiveDay(prevDate, currDate)) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}

/**
 * 前日の日付を取得（YYYY-MM-DD形式）
 */
function getPreviousDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00+09:00')
  date.setDate(date.getDate() - 1)
  return getDateString(date, JST_OFFSET_HOURS)
}

/**
 * 2つの日付が連続しているか判定
 */
function isConsecutiveDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1 + 'T00:00:00+09:00')
  const d2 = new Date(date2 + 'T00:00:00+09:00')
  const diffMs = d2.getTime() - d1.getTime()
  const oneDayMs = 24 * 60 * 60 * 1000
  return diffMs === oneDayMs
}
