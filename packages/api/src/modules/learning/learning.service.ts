/**
 * 学習完了サービス
 *
 * ストリーク更新とハート消費を統合的に管理する。
 * 両方の処理をトランザクションで包み、どちらかが失敗したら全てロールバック。
 * 将来的には POST /api/learning/complete のバックエンドとなる。
 */

import { prisma } from '../../db/client.js'
import type { HeartsService } from '../hearts/hearts.service.js'
import type { StreakService } from '../streak/streak.service.js'

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
}

export class LearningService {
  constructor(
    private streakService: StreakService,
    private heartsService: HeartsService
  ) {}

  /**
   * 学習完了を記録（トランザクション）
   *
   * ハート消費とストリーク更新を同一トランザクションで実行。
   * どちらかが失敗した場合、両方ロールバックされる。
   *
   * @param userId ユーザーID
   * @param options.consumeHeart ハートを消費するか（無料コンテンツはfalse）
   * @param options.heartAmount 消費するハート数（デフォルト: 1）
   */
  async recordCompletion(
    userId: string,
    options: { consumeHeart: boolean; heartAmount?: number }
  ): Promise<LearningCompletionResult> {
    return prisma.$transaction(async (tx) => {
      // 1. ハート消費（先に実行、失敗時はトランザクション全体がロールバック）
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

      // 2. ストリーク更新
      const streakResult = await this.streakService.recordStreak(userId, tx)

      // 最長記録を更新したか判定
      const isNewRecord =
        streakResult.updated &&
        streakResult.currentCount === streakResult.longestCount &&
        streakResult.currentCount > 1

      return {
        streak: {
          currentCount: streakResult.currentCount,
          longestCount: streakResult.longestCount,
          updated: streakResult.updated,
          isNewRecord,
        },
        hearts: heartsResult,
      }
    })
  }
}
