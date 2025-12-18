/**
 * 学習APIルーター
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthMiddleware } from '../../shared/middleware/auth.middleware.js'
import { createAuthRepository } from '../auth/auth.repository.js'
import { createHeartsRepository } from '../hearts/hearts.repository.js'
import { HeartsService } from '../hearts/hearts.service.js'
import { createLearningRecordRepository } from './learning-record.repository.js'
import { LearningService } from './learning.service.js'

/**
 * 認証済みユーザーIDを取得するヘルパー
 */
function getAuthenticatedUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new AppError('UNAUTHORIZED')
  }
  return request.user.userId
}

export async function learningRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const heartsRepository = createHeartsRepository(prisma)
  const learningRecordRepository = createLearningRecordRepository(prisma)
  const heartsService = new HeartsService(heartsRepository)
  const learningService = new LearningService(learningRecordRepository, heartsService)
  const authMiddleware = createAuthMiddleware(authRepository)

  // 認証フック: 全エンドポイントで認証必須
  app.addHook('preHandler', async (request) => {
    request.user = await authMiddleware.authenticate(request.headers.authorization)
  })

  /**
   * GET /api/learning/streak - ストリーク状態取得
   *
   * LearningRecordから計算されたストリーク情報を返す。
   */
  app.get('/streak', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)
    const streak = await learningService.getStreak(userId)

    return reply.send({
      data: {
        currentCount: streak.currentCount,
        longestCount: streak.longestCount,
        lastActiveDate: streak.lastActiveDate,
        updatedToday: streak.updatedToday,
        completedDates: streak.completedDates,
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })
}
