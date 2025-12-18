/**
 * ハートAPIルーター
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthMiddleware } from '../../shared/middleware/auth.middleware.js'
import { createAuthRepository } from '../auth/auth.repository.js'
import { LearningService } from '../learning/learning.service.js'
import { createStreakRepository } from '../streak/streak.repository.js'
import { StreakService } from '../streak/streak.service.js'
import { createHeartsRepository } from './hearts.repository.js'
import { consumeHeartsSchema } from './hearts.schema.js'
import { HeartsService } from './hearts.service.js'

/**
 * 認証済みユーザーIDを取得するヘルパー
 */
function getAuthenticatedUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new AppError('UNAUTHORIZED')
  }
  return request.user.userId
}

export async function heartsRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const heartsRepository = createHeartsRepository(prisma)
  const streakRepository = createStreakRepository(prisma)
  const heartsService = new HeartsService(heartsRepository)
  const streakService = new StreakService(streakRepository)
  const learningService = new LearningService(streakService, heartsService)
  const authMiddleware = createAuthMiddleware(authRepository)

  // 認証フック: 全エンドポイントで認証必須
  app.addHook('preHandler', async (request) => {
    request.user = await authMiddleware.authenticate(request.headers.authorization)
  })

  /**
   * GET /api/hearts - ハート状態取得（DB更新なし）
   */
  app.get('/', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)
    const hearts = await heartsService.getHearts(userId)

    return reply.send({
      data: {
        count: hearts.count,
        maxCount: hearts.maxCount,
        recoveryStartedAt: hearts.recoveryStartedAt.toISOString(),
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * POST /api/hearts/consume - ハート消費 + ストリーク更新
   *
   * LearningService経由で両方を処理し、統合レスポンスを返す。
   */
  app.post('/consume', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)

    // バリデーション
    const parseResult = consumeHeartsSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    // LearningService経由でストリーク更新 + ハート消費
    const result = await learningService.recordCompletion(userId, {
      consumeHeart: true,
      heartAmount: parseResult.data.amount,
    })

    // consumeHeart: true の場合、hearts は必ず存在する
    // 型安全性のため明示的にチェック
    if (!result.hearts) {
      throw new AppError('INTERNAL_ERROR')
    }

    return reply.send({
      data: {
        // ハート情報
        consumed: result.hearts.consumed,
        remaining: result.hearts.remaining,
        recoveryStartedAt: result.hearts.recoveryStartedAt.toISOString(),
        // ストリーク情報（追加）
        streak: {
          currentCount: result.streak.currentCount,
          longestCount: result.streak.longestCount,
          updated: result.streak.updated,
          isNewRecord: result.streak.isNewRecord,
        },
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })
}
