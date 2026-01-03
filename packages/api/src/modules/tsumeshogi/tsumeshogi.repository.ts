/**
 * 詰将棋リポジトリ（DB操作）
 */

import type { Tsumeshogi, PrismaClient } from '@prisma/client'

export interface FindAllOptions {
  moveCount?: number
  status?: string
  limit?: number
  offset?: number
}

export interface TsumeshogiRepository {
  findAll(filter?: FindAllOptions): Promise<Tsumeshogi[]>
  count(filter?: { moveCount?: number; status?: string }): Promise<number>
  findById(id: string): Promise<Tsumeshogi | null>
  findSolvedTsumeshogiIds(userId: string): Promise<string[]>
  findAttemptedTsumeshogiIds(userId: string): Promise<string[]>
}

export function createTsumeshogiRepository(prisma: PrismaClient): TsumeshogiRepository {
  return {
    async findAll(filter?: FindAllOptions): Promise<Tsumeshogi[]> {
      const where: { moveCount?: number; status?: string } = {}

      if (filter?.moveCount !== undefined) {
        where.moveCount = filter.moveCount
      }

      // デフォルトで公開済みのみ取得
      where.status = filter?.status ?? 'published'

      return prisma.tsumeshogi.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: filter?.offset,
        take: filter?.limit,
      })
    },

    async count(filter?: { moveCount?: number; status?: string }): Promise<number> {
      const where: { moveCount?: number; status?: string } = {}

      if (filter?.moveCount !== undefined) {
        where.moveCount = filter.moveCount
      }

      // デフォルトで公開済みのみ取得
      where.status = filter?.status ?? 'published'

      return prisma.tsumeshogi.count({ where })
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
