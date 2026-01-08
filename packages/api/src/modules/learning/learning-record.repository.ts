/**
 * 学習記録リポジトリ（DB操作）
 */

import { JST_OFFSET_HOURS, getDateString } from '@komaneko/shared/utils/date'
import type { LearningRecord, PrismaClient } from '@prisma/client'

import type { PrismaClientOrTx } from '../../db/client.js'

/** 問題ごとの試行データ */
export interface ProblemAttemptData {
  problemId: string
  problemIndex: number
  isCorrect: boolean
  usedHint: boolean
  usedSolution: boolean
}

export interface LearningRecordRepository {
  /**
   * 詰将棋の学習記録を作成（LearningRecord + TsumeshogiRecord）
   */
  createWithTsumeshogi(
    userId: string,
    data: {
      tsumeshogiId: string
      isCorrect: boolean
      completedDate: string | null // 完了時のみ設定（YYYY-MM-DD）
    },
    tx?: PrismaClientOrTx,
  ): Promise<LearningRecord>

  /**
   * レッスンの学習記録を作成（LearningRecord + LessonRecord + LessonProblemAttempt）
   */
  createWithLesson(
    userId: string,
    data: {
      lessonId: string
      correctCount: number
      problems: ProblemAttemptData[]
      completedDate: string // 完了時のみ呼ばれるため必須
      completionSeconds?: number
    },
    tx?: PrismaClientOrTx,
  ): Promise<LearningRecord>

  /**
   * 完了日リスト取得（過去N日間、ストリーク・カレンダー用）
   * 重複排除済みのユニークな日付リストを返す
   */
  findCompletedDates(userId: string, days: number, tx?: PrismaClientOrTx): Promise<string[]>

  /**
   * 最終完了日取得
   */
  findLastCompletedDate(userId: string, tx?: PrismaClientOrTx): Promise<string | null>

  /**
   * 全完了日取得（longestCount計算用）
   * 重複排除済みのユニークな日付リストを返す
   */
  findAllCompletedDates(userId: string, tx?: PrismaClientOrTx): Promise<string[]>
}

export function createLearningRecordRepository(prisma: PrismaClient): LearningRecordRepository {
  return {
    async createWithTsumeshogi(
      userId: string,
      data: {
        tsumeshogiId: string
        isCorrect: boolean
        completedDate: string | null
      },
      tx?: PrismaClientOrTx,
    ): Promise<LearningRecord> {
      const client = tx ?? prisma
      return client.learningRecord.create({
        data: {
          userId,
          contentType: 'tsumeshogi',
          isCompleted: data.isCorrect,
          completedDate: data.completedDate,
          tsumeshogiRecord: {
            create: {
              tsumeshogiId: data.tsumeshogiId,
              isCorrect: data.isCorrect,
            },
          },
        },
      })
    },

    async createWithLesson(
      userId: string,
      data: {
        lessonId: string
        correctCount: number
        problems: ProblemAttemptData[]
        completedDate: string
        completionSeconds?: number
      },
      tx?: PrismaClientOrTx,
    ): Promise<LearningRecord> {
      const client = tx ?? prisma
      return client.learningRecord.create({
        data: {
          userId,
          contentType: 'lesson',
          isCompleted: true, // レッスン完了時のみ呼ばれる
          completedDate: data.completedDate,
          lessonRecord: {
            create: {
              lessonId: data.lessonId,
              correctCount: data.correctCount,
              completionSeconds: data.completionSeconds,
              problemAttempts: {
                create: data.problems.map((p) => ({
                  problemId: p.problemId,
                  problemIndex: p.problemIndex,
                  isCorrect: p.isCorrect,
                  usedHint: p.usedHint,
                  usedSolution: p.usedSolution,
                })),
              },
            },
          },
        },
      })
    },

    async findCompletedDates(
      userId: string,
      days: number,
      tx?: PrismaClientOrTx,
    ): Promise<string[]> {
      const client = tx ?? prisma

      // 過去N日間の日付範囲を計算（今日を含む）
      const today = new Date()
      const cutoffDate = new Date(today)
      cutoffDate.setDate(cutoffDate.getDate() - days + 1)
      const cutoffDateString = getDateString(cutoffDate, JST_OFFSET_HOURS)

      // 過去N日間の完了日を取得（ユニーク、日付フィルタあり）
      const records = await client.learningRecord.findMany({
        where: {
          userId,
          isCompleted: true,
          completedDate: {
            not: null,
            gte: cutoffDateString,
          },
        },
        select: { completedDate: true },
        distinct: ['completedDate'],
        orderBy: { completedDate: 'desc' },
      })

      return records.map((r) => r.completedDate).filter((date): date is string => date !== null)
    },

    async findLastCompletedDate(userId: string, tx?: PrismaClientOrTx): Promise<string | null> {
      const client = tx ?? prisma

      const record = await client.learningRecord.findFirst({
        where: {
          userId,
          isCompleted: true,
          completedDate: { not: null },
        },
        select: { completedDate: true },
        orderBy: { completedDate: 'desc' },
      })

      return record?.completedDate ?? null
    },

    async findAllCompletedDates(userId: string, tx?: PrismaClientOrTx): Promise<string[]> {
      const client = tx ?? prisma

      const records = await client.learningRecord.findMany({
        where: {
          userId,
          isCompleted: true,
          completedDate: { not: null },
        },
        select: { completedDate: true },
        distinct: ['completedDate'],
        orderBy: { completedDate: 'asc' },
      })

      return records.map((r) => r.completedDate).filter((date): date is string => date !== null)
    },
  }
}
