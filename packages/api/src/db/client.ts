import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

/**
 * Prismaトランザクションクライアント型
 * $transaction 内で使用するクライアント
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * PrismaClientまたはトランザクションクライアント
 * Repository層で使用する共通型
 */
export type PrismaClientOrTx = PrismaClient | PrismaTransactionClient
