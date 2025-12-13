/**
 * ハートAPIルーター
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthMiddleware } from '../../shared/middleware/auth.middleware.js'
import { createAuthRepository } from '../auth/auth.repository.js'
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
  const heartsService = new HeartsService(heartsRepository)
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
        lastRefill: hearts.lastRefill.toISOString(),
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * POST /api/hearts/consume - ハート消費
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

    const result = await heartsService.consumeHearts(userId, parseResult.data.amount)

    return reply.send({
      data: {
        consumed: result.consumed,
        remaining: result.remaining,
        lastRefill: result.lastRefill.toISOString(),
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })
}
