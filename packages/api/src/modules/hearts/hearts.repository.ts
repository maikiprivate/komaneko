/**
 * ハートリポジトリ（DB操作）
 */

import type { Hearts, PrismaClient } from '@prisma/client'

export interface HeartsRepository {
  findByUserId(userId: string): Promise<Hearts | null>
  upsert(
    userId: string,
    data: { count: number; maxCount: number; lastRefill: Date }
  ): Promise<Hearts>
}

export function createHeartsRepository(prisma: PrismaClient): HeartsRepository {
  return {
    async findByUserId(userId: string): Promise<Hearts | null> {
      return prisma.hearts.findUnique({ where: { userId } })
    },

    async upsert(
      userId: string,
      data: { count: number; maxCount: number; lastRefill: Date }
    ): Promise<Hearts> {
      return prisma.hearts.upsert({
        where: { userId },
        create: {
          userId,
          count: data.count,
          maxCount: data.maxCount,
          lastRefill: data.lastRefill,
        },
        update: {
          count: data.count,
          maxCount: data.maxCount,
          lastRefill: data.lastRefill,
        },
      })
    },
  }
}
