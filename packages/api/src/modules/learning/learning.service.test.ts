/**
 * LearningService テスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LearningService } from './learning.service.js'

// prisma.$transactionをモック
vi.mock('../../db/client.js', () => ({
  prisma: {
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback({})
    ),
  },
}))

// モックサービス
const mockStreakService = {
  recordStreak: vi.fn(),
  getStreak: vi.fn(),
}

const mockHeartsService = {
  consumeHearts: vi.fn(),
  getHearts: vi.fn(),
}

describe('LearningService', () => {
  let service: LearningService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LearningService(
      mockStreakService as never,
      mockHeartsService as never
    )
  })

  describe('recordCompletion', () => {
    it('ハート消費ありの場合、トランザクション内でストリークとハートの両方を更新する', async () => {
      mockHeartsService.consumeHearts.mockResolvedValue({
        consumed: 1,
        remaining: 9,
        recoveryStartedAt: new Date('2025-01-01T00:00:00Z'),
      })
      mockStreakService.recordStreak.mockResolvedValue({
        updated: true,
        currentCount: 3,
        longestCount: 5,
      })

      const result = await service.recordCompletion('user-1', {
        consumeHeart: true,
      })

      // ハート消費が先に呼ばれる（トランザクションクライアント付き）
      expect(mockHeartsService.consumeHearts).toHaveBeenCalledWith(
        'user-1',
        1,
        expect.anything()
      )
      // その後ストリーク更新
      expect(mockStreakService.recordStreak).toHaveBeenCalledWith(
        'user-1',
        expect.anything()
      )
      expect(result.streak).toEqual({
        currentCount: 3,
        longestCount: 5,
        updated: true,
        isNewRecord: false,
      })
      expect(result.hearts).toEqual({
        consumed: 1,
        remaining: 9,
        recoveryStartedAt: new Date('2025-01-01T00:00:00Z'),
      })
    })

    it('ハート消費なしの場合、ストリークのみ更新する', async () => {
      mockStreakService.recordStreak.mockResolvedValue({
        updated: true,
        currentCount: 1,
        longestCount: 1,
      })

      const result = await service.recordCompletion('user-1', {
        consumeHeart: false,
      })

      expect(mockStreakService.recordStreak).toHaveBeenCalledWith(
        'user-1',
        expect.anything()
      )
      expect(mockHeartsService.consumeHearts).not.toHaveBeenCalled()
      expect(result.streak.currentCount).toBe(1)
      expect(result.hearts).toBeNull()
    })

    it('指定されたハート数を消費できる', async () => {
      mockHeartsService.consumeHearts.mockResolvedValue({
        consumed: 3,
        remaining: 7,
        recoveryStartedAt: new Date('2025-01-01T00:00:00Z'),
      })
      mockStreakService.recordStreak.mockResolvedValue({
        updated: true,
        currentCount: 1,
        longestCount: 1,
      })

      const result = await service.recordCompletion('user-1', {
        consumeHeart: true,
        heartAmount: 3,
      })

      expect(mockHeartsService.consumeHearts).toHaveBeenCalledWith(
        'user-1',
        3,
        expect.anything()
      )
      expect(result.hearts?.consumed).toBe(3)
    })

    it('同日2回目の学習ではストリーク更新されない', async () => {
      mockHeartsService.consumeHearts.mockResolvedValue({
        consumed: 1,
        remaining: 8,
        recoveryStartedAt: new Date('2025-01-01T00:00:00Z'),
      })
      mockStreakService.recordStreak.mockResolvedValue({
        updated: false,
        currentCount: 5,
        longestCount: 10,
      })

      const result = await service.recordCompletion('user-1', {
        consumeHeart: true,
      })

      expect(result.streak.updated).toBe(false)
      expect(result.streak.isNewRecord).toBe(false)
      // ハートは消費される
      expect(result.hearts?.consumed).toBe(1)
    })

    it('最長記録を更新した場合、isNewRecordがtrueになる', async () => {
      mockHeartsService.consumeHearts.mockResolvedValue({
        consumed: 1,
        remaining: 9,
        recoveryStartedAt: new Date('2025-01-01T00:00:00Z'),
      })
      mockStreakService.recordStreak.mockResolvedValue({
        updated: true,
        currentCount: 10,
        longestCount: 10, // currentCount と同じ = 最長更新
      })

      const result = await service.recordCompletion('user-1', {
        consumeHeart: true,
      })

      expect(result.streak.isNewRecord).toBe(true)
    })

    it('初日（currentCount=1）は最長記録更新とみなさない', async () => {
      mockStreakService.recordStreak.mockResolvedValue({
        updated: true,
        currentCount: 1,
        longestCount: 1,
      })

      const result = await service.recordCompletion('user-1', {
        consumeHeart: false,
      })

      // 初日は isNewRecord: false
      expect(result.streak.isNewRecord).toBe(false)
    })

    it('ハート不足時はトランザクション全体がロールバックされる', async () => {
      mockHeartsService.consumeHearts.mockRejectedValue(
        new Error('NO_HEARTS_LEFT')
      )

      await expect(
        service.recordCompletion('user-1', { consumeHeart: true })
      ).rejects.toThrow('NO_HEARTS_LEFT')

      // ハート消費が失敗したため、ストリーク更新は呼ばれない
      // （トランザクション内でハート消費が先に実行され、失敗で中断）
      expect(mockStreakService.recordStreak).not.toHaveBeenCalled()
    })
  })
})
