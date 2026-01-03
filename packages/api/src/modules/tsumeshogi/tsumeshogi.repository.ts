/**
 * 詰将棋リポジトリ（DB操作）
 */

import type { Tsumeshogi, PrismaClient } from '@prisma/client'

export interface TsumeshogiRepository {
  findAll(filter?: { moveCount?: number; status?: string }): Promise<Tsumeshogi[]>
  findById(id: string): Promise<Tsumeshogi | null>
  findSolvedTsumeshogiIds(userId: string): Promise<string[]>
  findAttemptedTsumeshogiIds(userId: string): Promise<string[]>
}

export function createTsumeshogiRepository(prisma: PrismaClient): TsumeshogiRepository {
  return {
    async findAll(filter?: { moveCount?: number; status?: string }): Promise<Tsumeshogi[]> {
      const where: { moveCount?: number; status?: string } = {}

      if (filter?.moveCount !== undefined) {
        where.moveCount = filter.moveCount
      }

      // デフォルトで公開済みのみ取得
      where.status = filter?.status ?? 'published'

      return prisma.tsumeshogi.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      })
    },

    async findById(id: string): Promise<Tsumeshogi | null> {
      return prisma.tsumeshogi.findUnique({ where: { id } })
    },

    async findSolvedTsumeshogiIds(userId: string): Promise<string[]> {
      const records = await prisma.tsumeshogiRecord.findMany({
        where: {
          learningRecord: { userId },
          isCorrect: true,
        },
        select: { tsumeshogiId: true },
        distinct: ['tsumeshogiId'],
      })
      return records.map((r) => r.tsumeshogiId)
    },

    async findAttemptedTsumeshogiIds(userId: string): Promise<string[]> {
      const records = await prisma.tsumeshogiRecord.findMany({
        where: {
          learningRecord: { userId },
        },
        select: { tsumeshogiId: true },
        distinct: ['tsumeshogiId'],
      })
      return records.map((r) => r.tsumeshogiId)
    },
  }
}
