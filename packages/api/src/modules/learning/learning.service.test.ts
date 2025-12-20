/**
 * LearningService テスト
 *
 * 新設計: LearningRecordRepository経由でストリークを計算
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LearningService } from './learning.service.js'
import type { LearningRecordRepository } from './learning-record.repository.js'

// prisma.$transactionをモック
vi.mock('../../db/client.js', () => ({
  prisma: {
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback({})
    ),
  },
}))

// モックリポジトリ
const mockLearningRecordRepository: LearningRecordRepository = {
  createWithTsumeshogi: vi.fn(),
  createWithLesson: vi.fn(),
  findCompletedDates: vi.fn(),
  findLastCompletedDate: vi.fn(),
  findAllCompletedDates: vi.fn(),
}

const mockHeartsService = {
  consumeHearts: vi.fn(),
  getHearts: vi.fn(),
}

// 日付モック用のヘルパー
function mockDate(dateString: string): () => void {
  const originalDate = global.Date
  const mockNow = new Date(dateString).getTime()

  // @ts-expect-error モック用
  global.Date = class extends originalDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(mockNow)
      } else {
        // @ts-expect-error モック用
        super(...args)
      }
    }
    static now(): number {
      return mockNow
    }
  }

  return () => {
    global.Date = originalDate
  }
}

describe('LearningService', () => {
  let service: LearningService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LearningService(
      mockLearningRecordRepository,
      mockHeartsService as never
    )
  })

  describe('recordCompletion', () => {
    it('正解時: LearningRecord作成 + ストリーク計算 + completedDates返却', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithTsumeshogi).mockResolvedValue({
          id: 'lr-1',
          userId: 'user-1',
          contentType: 'tsumeshogi',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        // レコード作成前: 今日はまだ記録なし
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-14',
          '2025-01-13',
        ])
        // レコード作成後の全日付（今日を含む）
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-13',
          '2025-01-14',
          '2025-01-15',
        ])
        mockHeartsService.consumeHearts.mockResolvedValue({
          consumed: 1,
          remaining: 9,
          recoveryStartedAt: new Date('2025-01-15T00:00:00Z'),
        })

        const result = await service.recordCompletion('user-1', {
          consumeHeart: true,
          contentType: 'tsumeshogi',
          contentId: 'tsume-123',
          isCorrect: true,
        })

        // LearningRecord作成確認
        expect(mockLearningRecordRepository.createWithTsumeshogi).toHaveBeenCalledWith(
          'user-1',
          {
            tsumeshogiId: 'tsume-123',
            isCorrect: true,
            completedDate: '2025-01-15',
          },
          expect.anything()
        )
        // ストリーク計算結果
        expect(result.streak.currentCount).toBe(3) // 3日連続
        expect(result.streak.longestCount).toBe(3)
        expect(result.streak.updated).toBe(true) // 今日初めての完了
        // completedDates返却（サービスが今日を追加）
        expect(result.completedDates).toEqual([
          '2025-01-15',
          '2025-01-14',
          '2025-01-13',
        ])
      } finally {
        restoreDate()
      }
    })

    it('不正解時: LearningRecord作成（isCompleted=false）、completedDateはnull', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithTsumeshogi).mockResolvedValue({
          id: 'lr-1',
          userId: 'user-1',
          contentType: 'tsumeshogi',
          isCompleted: false,
          completedDate: null,
          createdAt: new Date(),
        })
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-14',
        ])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-14',
        ])
        mockHeartsService.consumeHearts.mockResolvedValue({
          consumed: 1,
          remaining: 9,
          recoveryStartedAt: new Date('2025-01-15T00:00:00Z'),
        })

        const result = await service.recordCompletion('user-1', {
          consumeHeart: true,
          contentType: 'tsumeshogi',
          contentId: 'tsume-123',
          isCorrect: false,
        })

        // 不正解でもLearningRecord作成（苦手分析用）
        expect(mockLearningRecordRepository.createWithTsumeshogi).toHaveBeenCalledWith(
          'user-1',
          {
            tsumeshogiId: 'tsume-123',
            isCorrect: false,
            completedDate: null, // 不正解時はnull
          },
          expect.anything()
        )
        // ストリークは昨日の記録から計算（今日は更新されない）
        expect(result.streak.currentCount).toBe(1) // 昨日の1日分
        expect(result.streak.updated).toBe(false) // 今日は更新されていない
      } finally {
        restoreDate()
      }
    })

    it('ハート消費なしでも学習記録は作成される', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithTsumeshogi).mockResolvedValue({
          id: 'lr-1',
          userId: 'user-1',
          contentType: 'tsumeshogi',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])

        const result = await service.recordCompletion('user-1', {
          consumeHeart: false,
          contentType: 'tsumeshogi',
          contentId: 'tsume-123',
          isCorrect: true,
        })

        expect(mockLearningRecordRepository.createWithTsumeshogi).toHaveBeenCalled()
        expect(mockHeartsService.consumeHearts).not.toHaveBeenCalled()
        expect(result.hearts).toBeNull()
        expect(result.streak.currentCount).toBe(1)
      } finally {
        restoreDate()
      }
    })

    it('同日2回目の正解ではstreakのupdatedがfalseになる', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithTsumeshogi).mockResolvedValue({
          id: 'lr-2',
          userId: 'user-1',
          contentType: 'tsumeshogi',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        // レコード作成前: 既に今日の記録がある状態
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-15',
          '2025-01-14',
        ])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-14',
          '2025-01-15',
        ])

        const result = await service.recordCompletion('user-1', {
          consumeHeart: false,
          contentType: 'tsumeshogi',
          contentId: 'tsume-456',
          isCorrect: true,
        })

        expect(result.streak.currentCount).toBe(2)
        expect(result.streak.updated).toBe(false) // 同日2回目なのでfalse
      } finally {
        restoreDate()
      }
    })

    it('最長記録を更新した場合、isNewRecordがtrueになる', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithTsumeshogi).mockResolvedValue({
          id: 'lr-1',
          userId: 'user-1',
          contentType: 'tsumeshogi',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        // レコード作成前: 今日はまだ記録なし（4日連続中）
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-14',
          '2025-01-13',
          '2025-01-12',
          '2025-01-11',
        ])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-11',
          '2025-01-12',
          '2025-01-13',
          '2025-01-14',
          '2025-01-15',
        ])

        const result = await service.recordCompletion('user-1', {
          consumeHeart: false,
          contentType: 'tsumeshogi',
          contentId: 'tsume-123',
          isCorrect: true,
        })

        expect(result.streak.currentCount).toBe(5)
        expect(result.streak.longestCount).toBe(5)
        expect(result.streak.isNewRecord).toBe(true)
      } finally {
        restoreDate()
      }
    })

    it('初日（currentCount=1）は最長記録更新とみなさない', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithTsumeshogi).mockResolvedValue({
          id: 'lr-1',
          userId: 'user-1',
          contentType: 'tsumeshogi',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        // レコード作成前: まだ記録なし（初日）
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])

        const result = await service.recordCompletion('user-1', {
          consumeHeart: false,
          contentType: 'tsumeshogi',
          contentId: 'tsume-123',
          isCorrect: true,
        })

        expect(result.streak.currentCount).toBe(1)
        expect(result.streak.longestCount).toBe(1)
        expect(result.streak.isNewRecord).toBe(false) // 初日はfalse
      } finally {
        restoreDate()
      }
    })

    it('ハート不足時はトランザクション全体がロールバックされる', async () => {
      mockHeartsService.consumeHearts.mockRejectedValue(
        new Error('NO_HEARTS_LEFT')
      )

      await expect(
        service.recordCompletion('user-1', {
          consumeHeart: true,
          contentType: 'tsumeshogi',
          contentId: 'tsume-123',
          isCorrect: true,
        })
      ).rejects.toThrow('NO_HEARTS_LEFT')

      // ハート消費が失敗したため、LearningRecord作成も呼ばれない
      expect(mockLearningRecordRepository.createWithTsumeshogi).not.toHaveBeenCalled()
    })

    it('指定されたハート数を消費できる', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithTsumeshogi).mockResolvedValue({
          id: 'lr-1',
          userId: 'user-1',
          contentType: 'tsumeshogi',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])
        mockHeartsService.consumeHearts.mockResolvedValue({
          consumed: 3,
          remaining: 7,
          recoveryStartedAt: new Date('2025-01-15T00:00:00Z'),
        })

        const result = await service.recordCompletion('user-1', {
          consumeHeart: true,
          heartAmount: 3,
          contentType: 'tsumeshogi',
          contentId: 'tsume-123',
          isCorrect: true,
        })

        expect(mockHeartsService.consumeHearts).toHaveBeenCalledWith(
          'user-1',
          3,
          expect.anything()
        )
        expect(result.hearts?.consumed).toBe(3)
      } finally {
        restoreDate()
      }
    })
  })

  describe('getStreak', () => {
    it('LearningRecordからストリーク状態を計算する', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-15',
          '2025-01-14',
          '2025-01-13',
        ])
        vi.mocked(mockLearningRecordRepository.findLastCompletedDate).mockResolvedValue(
          '2025-01-15'
        )
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-13',
          '2025-01-14',
          '2025-01-15',
        ])

        const result = await service.getStreak('user-1')

        expect(result.currentCount).toBe(3)
        expect(result.longestCount).toBe(3)
        expect(result.lastActiveDate).toBe('2025-01-15')
        expect(result.updatedToday).toBe(true)
        expect(result.completedDates).toEqual([
          '2025-01-15',
          '2025-01-14',
          '2025-01-13',
        ])
      } finally {
        restoreDate()
      }
    })

    it('今日学習していない場合、昨日から連続をカウントする', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-14',
          '2025-01-13',
        ])
        vi.mocked(mockLearningRecordRepository.findLastCompletedDate).mockResolvedValue(
          '2025-01-14'
        )
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-13',
          '2025-01-14',
        ])

        const result = await service.getStreak('user-1')

        expect(result.currentCount).toBe(2) // 昨日と一昨日の2日連続
        expect(result.updatedToday).toBe(false)
      } finally {
        restoreDate()
      }
    })

    it('今日も昨日も学習していない場合、currentCountは0', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-10',
        ])
        vi.mocked(mockLearningRecordRepository.findLastCompletedDate).mockResolvedValue(
          '2025-01-10'
        )
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-10',
        ])

        const result = await service.getStreak('user-1')

        expect(result.currentCount).toBe(0)
        expect(result.longestCount).toBe(1) // 過去最長は1日
        expect(result.updatedToday).toBe(false)
      } finally {
        restoreDate()
      }
    })

    it('学習記録がない場合、全て0を返す', async () => {
      vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([])
      vi.mocked(mockLearningRecordRepository.findLastCompletedDate).mockResolvedValue(null)
      vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([])

      const result = await service.getStreak('user-1')

      expect(result.currentCount).toBe(0)
      expect(result.longestCount).toBe(0)
      expect(result.lastActiveDate).toBeNull()
      expect(result.updatedToday).toBe(false)
      expect(result.completedDates).toEqual([])
    })
  })

  describe('recordCompletion (lesson)', () => {
    it('レッスン完了時: createWithLessonが正しく呼ばれる', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithLesson).mockResolvedValue({
          id: 'lr-1',
          userId: 'user-1',
          contentType: 'lesson',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])
        mockHeartsService.consumeHearts.mockResolvedValue({
          consumed: 1,
          remaining: 9,
          recoveryStartedAt: new Date('2025-01-15T00:00:00Z'),
        })

        const problems = [
          { problemId: 'p1', problemIndex: 0, isCorrect: true, usedHint: false, usedSolution: false },
          { problemId: 'p2', problemIndex: 1, isCorrect: false, usedHint: true, usedSolution: false },
          { problemId: 'p3', problemIndex: 2, isCorrect: false, usedHint: false, usedSolution: true },
        ]

        const result = await service.recordCompletion('user-1', {
          consumeHeart: true,
          contentType: 'lesson',
          contentId: 'lesson-123',
          isCorrect: true,
          lessonData: {
            correctCount: 1,
            problems,
          },
        })

        // createWithLessonが正しいパラメータで呼ばれたことを確認
        expect(mockLearningRecordRepository.createWithLesson).toHaveBeenCalledWith(
          'user-1',
          {
            lessonId: 'lesson-123',
            correctCount: 1,
            problems,
            completedDate: '2025-01-15',
          },
          expect.anything()
        )
        // createWithTsumeshogiは呼ばれない
        expect(mockLearningRecordRepository.createWithTsumeshogi).not.toHaveBeenCalled()
        // ストリーク・ハートが正しく返される
        expect(result.streak.currentCount).toBe(1)
        expect(result.streak.updated).toBe(true)
        expect(result.hearts?.consumed).toBe(1)
      } finally {
        restoreDate()
      }
    })

    it('レッスン完了時: lessonDataがない場合はcreateWithLessonが呼ばれない', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([])

        // lessonDataなしでcontentType='lesson'を指定
        await expect(
          service.recordCompletion('user-1', {
            consumeHeart: false,
            contentType: 'lesson',
            contentId: 'lesson-123',
            isCorrect: true,
            // lessonData: undefined
          })
        ).rejects.toThrow('lessonData is required')

        // 記録メソッドは呼ばれない
        expect(mockLearningRecordRepository.createWithLesson).not.toHaveBeenCalled()
        expect(mockLearningRecordRepository.createWithTsumeshogi).not.toHaveBeenCalled()
      } finally {
        restoreDate()
      }
    })

    it('レッスン完了時: 同日2回目でもストリークupdated=falseになる', async () => {
      const restoreDate = mockDate('2025-01-15T10:00:00+09:00')
      try {
        vi.mocked(mockLearningRecordRepository.createWithLesson).mockResolvedValue({
          id: 'lr-2',
          userId: 'user-1',
          contentType: 'lesson',
          isCompleted: true,
          completedDate: '2025-01-15',
          createdAt: new Date(),
        })
        // 既に今日の記録がある
        vi.mocked(mockLearningRecordRepository.findCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])
        vi.mocked(mockLearningRecordRepository.findAllCompletedDates).mockResolvedValue([
          '2025-01-15',
        ])

        const result = await service.recordCompletion('user-1', {
          consumeHeart: false,
          contentType: 'lesson',
          contentId: 'lesson-456',
          isCorrect: true,
          lessonData: {
            correctCount: 3,
            problems: [
              { problemId: 'p1', problemIndex: 0, isCorrect: true, usedHint: false, usedSolution: false },
            ],
          },
        })

        expect(result.streak.updated).toBe(false) // 同日2回目
        expect(result.streak.currentCount).toBe(1)
      } finally {
        restoreDate()
      }
    })
  })
})
