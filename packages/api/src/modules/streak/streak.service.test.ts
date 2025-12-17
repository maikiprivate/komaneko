/**
 * ストリークサービスのテスト（TDD）
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

import { StreakService } from './streak.service.js'
import type { StreakRepository } from './streak.repository.js'

describe('StreakService', () => {
  let streakService: StreakService
  let mockRepository: StreakRepository

  beforeEach(() => {
    // モックリポジトリを作成
    mockRepository = {
      findByUserId: vi.fn(),
      upsert: vi.fn(),
    }
    streakService = new StreakService(mockRepository)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getStreak', () => {
    it('ストリーク状態を取得できる（DB更新なし）', async () => {
      // Arrange
      const mockStreak = {
        id: 'streak-123',
        userId: 'user-123',
        currentCount: 5,
        longestCount: 10,
        lastActiveDate: new Date('2025-01-15T00:00:00Z'),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockStreak)

      // Act
      const result = await streakService.getStreak('user-123')

      // Assert
      expect(result.currentCount).toBe(5)
      expect(result.longestCount).toBe(10)
      expect(result.lastActiveDate).toBe('2025-01-15')
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123')
      // DB更新が呼ばれていないことを確認
      expect(mockRepository.upsert).not.toHaveBeenCalled()
    })

    it('今日学習済みの場合、updatedToday=true', async () => {
      // Arrange: 現在時刻をJST 2025-01-15 12:00に固定
      vi.setSystemTime(new Date('2025-01-15T03:00:00Z')) // UTC 03:00 = JST 12:00
      const mockStreak = {
        id: 'streak-123',
        userId: 'user-123',
        currentCount: 5,
        longestCount: 10,
        lastActiveDate: new Date('2025-01-14T15:00:00Z'), // UTC 15:00 = JST 2025-01-15 00:00
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockStreak)

      // Act
      const result = await streakService.getStreak('user-123')

      // Assert
      expect(result.updatedToday).toBe(true)
    })

    it('今日学習していない場合、updatedToday=false', async () => {
      // Arrange: 現在時刻をJST 2025-01-15 12:00に固定
      vi.setSystemTime(new Date('2025-01-15T03:00:00Z')) // UTC 03:00 = JST 12:00
      const mockStreak = {
        id: 'streak-123',
        userId: 'user-123',
        currentCount: 5,
        longestCount: 10,
        lastActiveDate: new Date('2025-01-13T15:00:00Z'), // JST 2025-01-14 00:00（昨日）
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockStreak)

      // Act
      const result = await streakService.getStreak('user-123')

      // Assert
      expect(result.updatedToday).toBe(false)
    })

    it('ストリークが存在しない場合はデフォルト値を返す（DBには作成しない）', async () => {
      // Arrange
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(null)

      // Act
      const result = await streakService.getStreak('user-123')

      // Assert
      expect(result.currentCount).toBe(0)
      expect(result.longestCount).toBe(0)
      expect(result.lastActiveDate).toBeNull()
      expect(result.updatedToday).toBe(false)
      // DBにはまだ作成しない
      expect(mockRepository.upsert).not.toHaveBeenCalled()
    })
  })

  describe('recordStreak', () => {
    it('初回記録でストリーク1になる', async () => {
      // Arrange
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(null)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        id: 'streak-new',
        userId: 'user-123',
        currentCount: 1,
        longestCount: 1,
        lastActiveDate: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await streakService.recordStreak('user-123')

      // Assert
      expect(result.updated).toBe(true)
      expect(result.currentCount).toBe(1)
      expect(result.longestCount).toBe(1)
      expect(mockRepository.upsert).toHaveBeenCalledWith('user-123', {
        currentCount: 1,
        longestCount: 1,
        lastActiveDate: expect.any(Date),
      })
    })

    it('昨日も学習していた場合、ストリーク継続', async () => {
      // Arrange: 現在時刻をJST 2025-01-15 12:00に固定
      vi.setSystemTime(new Date('2025-01-15T03:00:00Z')) // UTC 03:00 = JST 12:00
      const mockStreak = {
        id: 'streak-123',
        userId: 'user-123',
        currentCount: 5,
        longestCount: 10,
        lastActiveDate: new Date('2025-01-13T15:00:00Z'), // JST 2025-01-14 00:00（昨日）
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockStreak)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        ...mockStreak,
        currentCount: 6,
      })

      // Act
      const result = await streakService.recordStreak('user-123')

      // Assert
      expect(result.updated).toBe(true)
      expect(result.currentCount).toBe(6) // 5 + 1
      expect(result.longestCount).toBe(10) // 変わらず
    })

    it('昨日学習していない場合、ストリークリセット', async () => {
      // Arrange: 現在時刻をJST 2025-01-15 12:00に固定
      vi.setSystemTime(new Date('2025-01-15T03:00:00Z')) // UTC 03:00 = JST 12:00
      const mockStreak = {
        id: 'streak-123',
        userId: 'user-123',
        currentCount: 5,
        longestCount: 10,
        lastActiveDate: new Date('2025-01-12T15:00:00Z'), // JST 2025-01-13 00:00（2日前）
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockStreak)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        ...mockStreak,
        currentCount: 1,
      })

      // Act
      const result = await streakService.recordStreak('user-123')

      // Assert
      expect(result.updated).toBe(true)
      expect(result.currentCount).toBe(1) // リセット
      expect(result.longestCount).toBe(10) // 変わらず
    })

    it('今日すでに記録済みの場合、updated=false', async () => {
      // Arrange: 現在時刻をJST 2025-01-15 12:00に固定
      vi.setSystemTime(new Date('2025-01-15T03:00:00Z')) // UTC 03:00 = JST 12:00
      const mockStreak = {
        id: 'streak-123',
        userId: 'user-123',
        currentCount: 5,
        longestCount: 10,
        lastActiveDate: new Date('2025-01-14T15:00:00Z'), // JST 2025-01-15 00:00（今日）
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockStreak)

      // Act
      const result = await streakService.recordStreak('user-123')

      // Assert
      expect(result.updated).toBe(false)
      expect(result.currentCount).toBe(5) // 変わらず
      expect(result.longestCount).toBe(10) // 変わらず
      // DB更新が呼ばれていないことを確認
      expect(mockRepository.upsert).not.toHaveBeenCalled()
    })

    it('最長記録が更新される', async () => {
      // Arrange: 現在時刻をJST 2025-01-15 12:00に固定
      vi.setSystemTime(new Date('2025-01-15T03:00:00Z')) // UTC 03:00 = JST 12:00
      const mockStreak = {
        id: 'streak-123',
        userId: 'user-123',
        currentCount: 10,
        longestCount: 10,
        lastActiveDate: new Date('2025-01-13T15:00:00Z'), // JST 2025-01-14 00:00（昨日）
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByUserId).mockResolvedValue(mockStreak)
      vi.mocked(mockRepository.upsert).mockResolvedValue({
        ...mockStreak,
        currentCount: 11,
        longestCount: 11,
      })

      // Act
      const result = await streakService.recordStreak('user-123')

      // Assert
      expect(result.updated).toBe(true)
      expect(result.currentCount).toBe(11)
      expect(result.longestCount).toBe(11) // 更新された
      expect(mockRepository.upsert).toHaveBeenCalledWith('user-123', {
        currentCount: 11,
        longestCount: 11,
        lastActiveDate: expect.any(Date),
      })
    })
  })
})
