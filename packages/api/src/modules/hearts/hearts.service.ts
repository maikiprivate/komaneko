/**
 * ハートサービス（ビジネスロジック）
 */

import type { PrismaClientOrTx } from '../../db/client.js'
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
  recoveryStartedAt: Date
}

interface ConsumeResult {
  consumed: number
  remaining: number
  recoveryStartedAt: Date
}

export class HeartsService {
  constructor(private repository: HeartsRepository) {}

  /**
   * 現在のハート数を計算する（静的メソッド、クライアントと共通ロジック）
   */
  static calculateCurrentHearts(hearts: {
    count: number
    maxCount: number
    recoveryStartedAt: Date
  }): number {
    const msSinceStart = Date.now() - hearts.recoveryStartedAt.getTime()
    const recovered = Math.floor(msSinceStart / RECOVERY_INTERVAL_MS)
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
        recoveryStartedAt: now,
      })
      return {
        count: created.count,
        maxCount: created.maxCount,
        recoveryStartedAt: created.recoveryStartedAt,
      }
    }

    return {
      count: hearts.count,
      maxCount: hearts.maxCount,
      recoveryStartedAt: hearts.recoveryStartedAt,
    }
  }

  /**
   * ハートを消費（回復計算 → 消費 → DB更新）
   *
   * recoveryStartedAtの更新ロジック:
   * - 満タンから消費: 消費時刻を新しいrecoveryStartedAtに（回復タイマー開始）
   * - 回復中に消費: recoveryStartedAtは変更なし（残り時間を保持）
   *
   * @param userId ユーザーID
   * @param amount 消費量
   * @param tx オプションのトランザクションクライアント
   */
  async consumeHearts(
    userId: string,
    amount: number,
    tx?: PrismaClientOrTx
  ): Promise<ConsumeResult> {
    const hearts = await this.repository.findByUserId(userId, tx)

    // 新規ユーザーの場合はデフォルト値を使用（満タン状態）
    const currentData = hearts ?? {
      count: DEFAULT_HEARTS,
      maxCount: DEFAULT_MAX_HEARTS,
      recoveryStartedAt: new Date(),
    }

    // 回復計算
    const currentCount = HeartsService.calculateCurrentHearts(currentData)

    // ハート不足チェック
    if (currentCount < amount) {
      throw new AppError('NO_HEARTS_LEFT')
    }

    // 消費後のハート数
    const remaining = currentCount - amount

    // recoveryStartedAtの更新
    const wasFull = currentCount >= currentData.maxCount
    const newRecoveryStartedAt = wasFull
      ? new Date() // 満タンから消費: 今から回復タイマー開始
      : currentData.recoveryStartedAt // 回復中: 変更なし

    // DB更新
    await this.repository.upsert(
      userId,
      {
        count: remaining,
        maxCount: currentData.maxCount,
        recoveryStartedAt: newRecoveryStartedAt,
      },
      tx
    )

    return {
      consumed: amount,
      remaining,
      recoveryStartedAt: newRecoveryStartedAt,
    }
  }
}
