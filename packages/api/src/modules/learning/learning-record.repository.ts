/**
 * 学習記録リポジトリ（DB操作）
 */

import type { LearningRecord, PrismaClient } from '@prisma/client'
import type { PrismaClientOrTx } from '../../db/client.js'

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
    tx?: PrismaClientOrTx
  ): Promise<LearningRecord>

  /**
   * 完了日リスト取得（過去N日間、ストリーク・カレンダー用）
   * 重複排除済みのユニークな日付リストを返す
   */
  findCompletedDates(
    userId: string,
    days: number,
    tx?: PrismaClientOrTx
  ): Promise<string[]>

  /**
   * 最終完了日取得
   */
  findLastCompletedDate(
    userId: string,
    tx?: PrismaClientOrTx
  ): Promise<string | null>

  /**
   * 全完了日取得（longestCount計算用）
   * 重複排除済みのユニークな日付リストを返す
   */
  findAllCompletedDates(
    userId: string,
    tx?: PrismaClientOrTx
  ): Promise<string[]>
}

export function createLearningRecordRepository(
  prisma: PrismaClient
): LearningRecordRepository {
  return {
    async createWithTsumeshogi(
      userId: string,
      data: {
        tsumeshogiId: string
        isCorrect: boolean
        completedDate: string | null
      },
      tx?: PrismaClientOrTx
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

    async findCompletedDates(
      userId: string,
      days: number,
      tx?: PrismaClientOrTx
    ): Promise<string[]> {
      const client = tx ?? prisma

      // 過去N日間の完了日を取得（ユニーク）
      const records = await client.learningRecord.findMany({
        where: {
          userId,
          isCompleted: true,
          completedDate: { not: null },
        },
        select: { completedDate: true },
        distinct: ['completedDate'],
        orderBy: { completedDate: 'desc' },
        take: days,
      })

      return records
        .map((r) => r.completedDate)
        .filter((date): date is string => date !== null)
    },

    async findLastCompletedDate(
      userId: string,
      tx?: PrismaClientOrTx
    ): Promise<string | null> {
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

    async findAllCompletedDates(
      userId: string,
      tx?: PrismaClientOrTx
    ): Promise<string[]> {
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

      return records
        .map((r) => r.completedDate)
        .filter((date): date is string => date !== null)
    },
  }
}
