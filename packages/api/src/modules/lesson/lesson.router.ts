/**
 * レッスンAPIルーター
 */

import type { FastifyInstance } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthMiddleware } from '../../shared/middleware/auth.middleware.js'
import { getAuthenticatedUserId } from '../../shared/utils/getAuthenticatedUserId.js'
import { createAuthRepository } from '../auth/auth.repository.js'
import { createHeartsRepository } from '../hearts/hearts.repository.js'
import { HeartsService } from '../hearts/hearts.service.js'
import { createLearningRecordRepository } from '../learning/learning-record.repository.js'
import { LearningService } from '../learning/learning.service.js'
import { recordLessonSchema } from './lesson.schema.js'

export async function lessonRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const authMiddleware = createAuthMiddleware(authRepository)

  // LearningService
  const learningRecordRepository = createLearningRecordRepository(prisma)
  const heartsRepository = createHeartsRepository(prisma)
  const heartsService = new HeartsService(heartsRepository)
  const learningService = new LearningService(learningRecordRepository, heartsService)

  // 認証フック: 全エンドポイントで認証必須
  app.addHook('preHandler', async (request) => {
    request.user = await authMiddleware.authenticate(request.headers.authorization)
  })

  /**
   * POST /api/lesson/record - 学習記録
   *
   * レッスンの学習結果を記録し、ハート消費とストリーク更新を行う。
   * - レッスン完了時に常にストリーク更新（部分正解でもOK）
   * - ハート消費は isCorrect=true の時のみ
   */
  app.post('/record', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)

    // バリデーション
    const parseResult = recordLessonSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { lessonId, isCorrect } = parseResult.data

    // サーバー側でハート消費を決定（正解時のみ1ハート消費）
    const result = await learningService.recordCompletion(userId, {
      consumeHeart: isCorrect,
      contentType: 'lesson',
      contentId: lessonId,
      isCorrect,
    })

    return reply.send({
      data: {
        // 正解時のみハート情報を返す
        hearts: result.hearts
          ? {
              consumed: result.hearts.consumed,
              remaining: result.hearts.remaining,
              recoveryStartedAt: result.hearts.recoveryStartedAt.toISOString(),
            }
          : null,
        streak: result.streak,
        completedDates: result.completedDates,
      },
    })
  })
}
