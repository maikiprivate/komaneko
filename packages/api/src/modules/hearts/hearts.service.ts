/**
 * ハートサービス（ビジネスロジック）
 */

import { AppError } from '../../shared/errors/AppError.js'
import type { HeartsRepository } from './hearts.repository.js'

/** 回復間隔（ミリ秒）: 1時間 */
const RECOVERY_INTERVAL_MS = 60 * 60 * 1000

/** デフォルトハート数 */
const DEFAULT_HEARTS = 10

/** デフォルト最大ハート数 */
const DEFAULT_MAX_HEARTS = 10

interface HeartsData {
  count: number
  maxCount: number
  lastRefill: Date
}

interface ConsumeResult {
  consumed: number
  remaining: number
  lastRefill: Date
}

export class HeartsService {
  constructor(private repository: HeartsRepository) {}

  /**
   * 現在のハート数を計算する（静的メソッド、クライアントと共通ロジック）
   */
  static calculateCurrentHearts(hearts: {
    count: number
    maxCount: number
    lastRefill: Date
  }): number {
    const msSinceRefill = Date.now() - hearts.lastRefill.getTime()
    const recovered = Math.floor(msSinceRefill / RECOVERY_INTERVAL_MS)
    return Math.min(hearts.count + recovered, hearts.maxCount)
  }

  /**
   * ハート状態を取得（DB更新なし）
   */
  async getHearts(userId: string): Promise<HeartsData> {
    const hearts = await this.repository.findByUserId(userId)

    if (!hearts) {
      // 新規ユーザー: デフォルト値で作成
      const now = new Date()
      const created = await this.repository.upsert(userId, {
        count: DEFAULT_HEARTS,
        maxCount: DEFAULT_MAX_HEARTS,
        lastRefill: now,
      })
      return {
        count: created.count,
        maxCount: created.maxCount,
        lastRefill: created.lastRefill,
      }
    }

    return {
      count: hearts.count,
      maxCount: hearts.maxCount,
      lastRefill: hearts.lastRefill,
    }
  }

  /**
   * ハートを消費（回復計算 → 消費 → DB更新）
   */
  async consumeHearts(userId: string, amount: number): Promise<ConsumeResult> {
    const hearts = await this.repository.findByUserId(userId)

    // 新規ユーザーの場合はデフォルト値を使用
    const currentData = hearts ?? {
      count: DEFAULT_HEARTS,
      maxCount: DEFAULT_MAX_HEARTS,
      lastRefill: new Date(),
    }

    // 回復計算
    const currentCount = HeartsService.calculateCurrentHearts(currentData)

    // ハート不足チェック
    if (currentCount < amount) {
      throw new AppError('NO_HEARTS_LEFT')
    }

    // 消費後のハート数
    const remaining = currentCount - amount

    // lastRefillの更新: 回復があった場合は現在時刻に更新
    const recovered =
      currentCount - (hearts?.count ?? DEFAULT_HEARTS)
    const newLastRefill =
      recovered > 0 ? new Date() : currentData.lastRefill

    // DB更新
    await this.repository.upsert(userId, {
      count: remaining,
      maxCount: currentData.maxCount,
      lastRefill: newLastRefill,
    })

    return {
      consumed: amount,
      remaining,
      lastRefill: newLastRefill,
    }
  }
}
