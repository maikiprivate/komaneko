/**
 * ストリークリポジトリ（DB操作）
 */

import type { Streak, PrismaClient } from '@prisma/client'
import type { PrismaClientOrTx } from '../../db/client.js'

export interface StreakRepository {
  findByUserId(userId: string, tx?: PrismaClientOrTx): Promise<Streak | null>
  upsert(
    userId: string,
    data: { currentCount: number; longestCount: number; lastActiveDate: Date },
    tx?: PrismaClientOrTx
  ): Promise<Streak>
}

export function createStreakRepository(prisma: PrismaClient): StreakRepository {
  return {
    async findByUserId(
      userId: string,
      tx?: PrismaClientOrTx
    ): Promise<Streak | null> {
      const client = tx ?? prisma
      return client.streak.findUnique({ where: { userId } })
    },

    async upsert(
      userId: string,
      data: { currentCount: number; longestCount: number; lastActiveDate: Date },
      tx?: PrismaClientOrTx
    ): Promise<Streak> {
      const client = tx ?? prisma
      return client.streak.upsert({
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
