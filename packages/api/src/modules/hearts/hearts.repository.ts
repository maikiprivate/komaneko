/**
 * ハートリポジトリ（DB操作）
 */

import type { Hearts, PrismaClient } from '@prisma/client'
import type { PrismaClientOrTx } from '../../db/client.js'

export interface HeartsRepository {
  findByUserId(userId: string, tx?: PrismaClientOrTx): Promise<Hearts | null>
  upsert(
    userId: string,
    data: { count: number; maxCount: number; recoveryStartedAt: Date },
    tx?: PrismaClientOrTx
  ): Promise<Hearts>
}

export function createHeartsRepository(prisma: PrismaClient): HeartsRepository {
  return {
    async findByUserId(
      userId: string,
      tx?: PrismaClientOrTx
    ): Promise<Hearts | null> {
      const client = tx ?? prisma
      return client.hearts.findUnique({ where: { userId } })
    },

    async upsert(
      userId: string,
      data: { count: number; maxCount: number; recoveryStartedAt: Date },
      tx?: PrismaClientOrTx
    ): Promise<Hearts> {
      const client = tx ?? prisma
      return client.hearts.upsert({
        where: { userId },
        create: {
          userId,
          count: data.count,
          maxCount: data.maxCount,
          recoveryStartedAt: data.recoveryStartedAt,
        },
        update: {
          count: data.count,
          maxCount: data.maxCount,
          recoveryStartedAt: data.recoveryStartedAt,
        },
      })
    },
  }
}
