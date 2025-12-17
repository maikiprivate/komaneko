/**
 * ストリークリポジトリ（DB操作）
 */

import type { Streak, PrismaClient } from '@prisma/client'

export interface StreakRepository {
  findByUserId(userId: string): Promise<Streak | null>
  upsert(
    userId: string,
    data: { currentCount: number; longestCount: number; lastActiveDate: Date }
  ): Promise<Streak>
}

export function createStreakRepository(prisma: PrismaClient): StreakRepository {
  return {
    async findByUserId(userId: string): Promise<Streak | null> {
      return prisma.streak.findUnique({ where: { userId } })
    },

    async upsert(
      userId: string,
      data: { currentCount: number; longestCount: number; lastActiveDate: Date }
    ): Promise<Streak> {
      return prisma.streak.upsert({
        where: { userId },
        create: {
          userId,
          currentCount: data.currentCount,
          longestCount: data.longestCount,
          lastActiveDate: data.lastActiveDate,
        },
        update: {
          currentCount: data.currentCount,
          longestCount: data.longestCount,
          lastActiveDate: data.lastActiveDate,
        },
      })
    },
  }
}
