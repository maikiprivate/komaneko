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
   * POST /api/lesson/record - レッスン完了記録
   *
   * レッスンの学習結果を記録し、ハート消費とストリーク更新を行う。
   * - 完了時のみ呼び出し（中断時はAPI呼び出しなし）
   * - 問題ごとの詳細（isCorrect, usedHint, usedSolution）を記録
   * - 常に1ハート消費、常にストリーク更新
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

    const { lessonId, problems, completionSeconds } = parseResult.data

    // 初回正解数をカウント（isCorrect=trueの問題数）
    const correctCount = problems.filter((p) => p.isCorrect).length

    // レッスン完了は常にハート消費・ストリーク更新
    const result = await learningService.recordCompletion(userId, {
      consumeHeart: true,
      contentType: 'lesson',
      contentId: lessonId,
      isCorrect: true, // 完了時のみ呼ばれるため常にtrue
      lessonData: {
        correctCount,
        problems,
        completionSeconds,
      },
    })

    return reply.send({
      data: {
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
