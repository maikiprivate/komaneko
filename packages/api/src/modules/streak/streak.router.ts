/**
 * ストリークAPIルーター
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthMiddleware } from '../../shared/middleware/auth.middleware.js'
import { createAuthRepository } from '../auth/auth.repository.js'
import { createStreakRepository } from './streak.repository.js'
import { StreakService } from './streak.service.js'

/**
 * 認証済みユーザーIDを取得するヘルパー
 */
function getAuthenticatedUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new AppError('UNAUTHORIZED')
  }
  return request.user.userId
}

export async function streakRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const streakRepository = createStreakRepository(prisma)
  const streakService = new StreakService(streakRepository)
  const authMiddleware = createAuthMiddleware(authRepository)

  // 認証フック: 全エンドポイントで認証必須
  app.addHook('preHandler', async (request) => {
    request.user = await authMiddleware.authenticate(request.headers.authorization)
  })

  /**
   * GET /api/streak - ストリーク状態取得（DB更新なし）
   */
  app.get('/', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)
    const streak = await streakService.getStreak(userId)

    return reply.send({
      data: {
        currentCount: streak.currentCount,
        longestCount: streak.longestCount,
        lastActiveDate: streak.lastActiveDate,
        updatedToday: streak.updatedToday,
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })

  // POST /api/streak/record は削除
  // ストリーク更新は LearningService 経由で内部的に呼び出される
}
