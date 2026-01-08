/**
 * 詰将棋リポジトリ（DB操作）
 */

import type { PrismaClient, Tsumeshogi } from '@prisma/client'

export interface FindAllOptions {
  moveCount?: number
  status?: string
  limit?: number
  /**
   * この問題番号より後の問題を取得（カーソルベースページネーション）
   * 未指定の場合は先頭から取得
   */
  afterNumber?: number
  /**
   * 指定IDのみ取得（solved/in_progress用）
   * 注意: excludeIdsと同時指定の場合、includeIdsが優先される
   */
  includeIds?: string[]
  /**
   * 指定IDを除外（unsolved用）
   * 注意: includeIdsと同時指定の場合、無視される
   */
  excludeIds?: string[]
}

/** countメソッドのオプション（FindAllOptionsからlimit/afterNumberを除いたもの） */
export type CountOptions = Omit<FindAllOptions, 'limit' | 'afterNumber'>

export interface TsumeshogiRepository {
  findAll(filter?: FindAllOptions): Promise<Tsumeshogi[]>
  count(filter?: CountOptions): Promise<number>
  findById(id: string): Promise<Tsumeshogi | null>
  findSolvedTsumeshogiIds(userId: string): Promise<string[]>
  findAttemptedTsumeshogiIds(userId: string): Promise<string[]>
}

/** where句を構築するヘルパー */
function buildWhereClause(filter?: CountOptions, afterNumber?: number) {
  const where: {
    moveCount?: number
    status?: string
    id?: { in?: string[]; notIn?: string[] }
    problemNumber?: { gt: number }
  } = {}

  if (filter?.moveCount !== undefined) {
    where.moveCount = filter.moveCount
  }

  // デフォルトで公開済みのみ取得
  where.status = filter?.status ?? 'published'

  // ID指定フィルタ（空配列は無視）
  if (filter?.includeIds?.length) {
    where.id = { in: filter.includeIds }
  } else if (filter?.excludeIds?.length) {
    where.id = { notIn: filter.excludeIds }
  }

  // カーソルベースページネーション（afterNumberより後を取得）
  if (afterNumber !== undefined) {
    where.problemNumber = { gt: afterNumber }
  }

  return where
}

export function createTsumeshogiRepository(prisma: PrismaClient): TsumeshogiRepository {
  return {
    async findAll(filter?: FindAllOptions): Promise<Tsumeshogi[]> {
      return prisma.tsumeshogi.findMany({
        where: buildWhereClause(filter, filter?.afterNumber),
        orderBy: { problemNumber: 'asc' },
        take: filter?.limit,
      })
    },

    async count(filter?: CountOptions): Promise<number> {
      return prisma.tsumeshogi.count({ where: buildWhereClause(filter) })
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
