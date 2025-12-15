/**
 * ハートサービスのテスト（TDD）
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HeartsService } from './hearts.service.js'
import type { HeartsRepository } from './hearts.repository.js'

describe('HeartsService', () => {
  let heartsService: HeartsService
  let mockRepository: HeartsRepository

  beforeEach(() => {
    // モックリポジトリを作成
    mockRepository = {
      findByUserId: vi.fn(),
      upsert: vi.fn(),
    }
    heartsService = new HeartsService(mockRepository)
  })

  describe('getHearts', () => {
    it('ハート状態を取得できる（DB更新なし）', async () => {
      // Arrange
      const mockHearts = {
        id: 'hearts-123',
        userId: 'user-123',
        count: 5,
        maxCount: 10,
        recoveryStartedAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockHearts)

      // Act
      const result = await heartsService.getHearts('user-123')

      // Assert
      expect(result.count).toBe(5)
      expect(result.maxCount).toBe(10)
      expect(result.recoveryStartedAt).toEqual(new Date('2025-01-01T00:00:00Z'))
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123')
      // DB更新が呼ばれていないことを確認
      expect(mockRepository.upsert).not.toHaveBeenCalled()
    })

    it('ハートが存在しない場合はデフォルト値で作成して返す', async () => {
      // Arrange
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(null)
      const mockCreatedHearts = {
        id: 'hearts-new',
        userId: 'user-123',
        count: 10,
        maxCount: 10,
        recoveryStartedAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.upsert).mockResolvedValue(mockCreatedHearts)

      // Act
      const result = await heartsService.getHearts('user-123')

      // Assert
      expect(result.count).toBe(10)
      expect(result.maxCount).toBe(10)
      expect(mockRepository.upsert).toHaveBeenCalledWith('user-123', {
        count: 10,
        maxCount: 10,
        recoveryStartedAt: expect.any(Date),
      })
    })
  })

  describe('consumeHearts', () => {
    it('ハートを消費できる（回復計算なし）', async () => {
      // Arrange: 5ハート、回復なし（recoveryStartedAtは現在時刻）
      const now = new Date()
      const mockHearts = {
        id: 'hearts-123',
        userId: 'user-123',
        count: 5,
        maxCount: 10,
        recoveryStartedAt: now,
        updatedAt: now,
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockHearts)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        ...mockHearts,
        count: 4,
      })

      // Act
      const result = await heartsService.consumeHearts('user-123', 1)

      // Assert
      expect(result.consumed).toBe(1)
      expect(result.remaining).toBe(4)
      expect(mockRepository.upsert).toHaveBeenCalledWith('user-123', {
        count: 4,
        maxCount: 10,
        recoveryStartedAt: now,
      })
    })

    it('複数ハートを一度に消費できる', async () => {
      // Arrange
      const now = new Date()
      const mockHearts = {
        id: 'hearts-123',
        userId: 'user-123',
        count: 5,
        maxCount: 10,
        recoveryStartedAt: now,
        updatedAt: now,
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockHearts)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        ...mockHearts,
        count: 2,
      })

      // Act
      const result = await heartsService.consumeHearts('user-123', 3)

      // Assert
      expect(result.consumed).toBe(3)
      expect(result.remaining).toBe(2)
    })

    it('回復後のハートから消費できる', async () => {
      // Arrange: 3時間前にrecoveryStartedAt → 3ハート回復
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      const mockHearts = {
        id: 'hearts-123',
        userId: 'user-123',
        count: 5,
        maxCount: 10,
        recoveryStartedAt: threeHoursAgo,
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockHearts)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        ...mockHearts,
        count: 7, // 5 + 3回復 - 1消費 = 7
      })

      // Act
      const result = await heartsService.consumeHearts('user-123', 1)

      // Assert
      expect(result.consumed).toBe(1)
      expect(result.remaining).toBe(7) // 5 + 3回復 - 1消費
    })

    it('回復でmaxCountを超えない', async () => {
      // Arrange: 10時間前にrecoveryStartedAt、count=8 → 回復上限10
      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000)
      const mockHearts = {
        id: 'hearts-123',
        userId: 'user-123',
        count: 8,
        maxCount: 10,
        recoveryStartedAt: tenHoursAgo,
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockHearts)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        ...mockHearts,
        count: 9, // min(8 + 10, 10) - 1 = 9
      })

      // Act
      const result = await heartsService.consumeHearts('user-123', 1)

      // Assert
      expect(result.consumed).toBe(1)
      expect(result.remaining).toBe(9) // 10（上限） - 1
    })

    it('ハートが足りない場合はNO_HEARTS_LEFTエラーをスローする', async () => {
      // Arrange
      const now = new Date()
      const mockHearts = {
        id: 'hearts-123',
        userId: 'user-123',
        count: 0,
        maxCount: 10,
        recoveryStartedAt: now,
        updatedAt: now,
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockHearts)

      // Act & Assert
      await expect(heartsService.consumeHearts('user-123', 1)).rejects.toMatchObject({
        code: 'NO_HEARTS_LEFT',
      })
      // DB更新が呼ばれていないことを確認
      expect(mockRepository.upsert).not.toHaveBeenCalled()
    })

    it('要求量が現在のハートより多い場合はNO_HEARTS_LEFTエラーをスローする', async () => {
      // Arrange
      const now = new Date()
      const mockHearts = {
        id: 'hearts-123',
        userId: 'user-123',
        count: 2,
        maxCount: 10,
        recoveryStartedAt: now,
        updatedAt: now,
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockHearts)

      // Act & Assert
      await expect(heartsService.consumeHearts('user-123', 3)).rejects.toMatchObject({
        code: 'NO_HEARTS_LEFT',
      })
    })

    it('ハートが存在しない新規ユーザーでもデフォルト値から消費できる', async () => {
      // Arrange
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(null)
      const mockCreatedHearts = {
        id: 'hearts-new',
        userId: 'user-123',
        count: 9, // 10 - 1
        maxCount: 10,
        recoveryStartedAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.upsert).mockResolvedValue(mockCreatedHearts)

      // Act
      const result = await heartsService.consumeHearts('user-123', 1)

      // Assert
      expect(result.consumed).toBe(1)
      expect(result.remaining).toBe(9)
    })
  })

  describe('calculateCurrentHearts', () => {
    it('回復計算が正しく行われる', () => {
      // Arrange: 2.5時間前 → 2ハート回復
      const twoAndHalfHoursAgo = new Date(Date.now() - 2.5 * 60 * 60 * 1000)

      // Act
      const result = HeartsService.calculateCurrentHearts({
        count: 5,
        maxCount: 10,
        recoveryStartedAt: twoAndHalfHoursAgo,
      })

      // Assert
      expect(result).toBe(7) // 5 + 2
    })

    it('maxCountを超えない', () => {
      // Arrange: 24時間前、count=5 → 24回復だが上限10
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Act
      const result = HeartsService.calculateCurrentHearts({
        count: 5,
        maxCount: 10,
        recoveryStartedAt: oneDayAgo,
      })

      // Assert
      expect(result).toBe(10)
    })

    it('回復間隔未満なら回復しない', () => {
      // Arrange: 30分前
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

      // Act
      const result = HeartsService.calculateCurrentHearts({
        count: 5,
        maxCount: 10,
        recoveryStartedAt: thirtyMinutesAgo,
      })

      // Assert
      expect(result).toBe(5)
    })
  })
})
