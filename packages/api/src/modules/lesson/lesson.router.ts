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
import { createLessonReadRepository } from './lesson.repository.js'
import { recordLessonSchema } from './lesson.schema.js'
import { LessonService } from './lesson.service.js'

export async function lessonRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const authMiddleware = createAuthMiddleware(authRepository)
  const lessonReadRepository = createLessonReadRepository(prisma)
  const lessonService = new LessonService(lessonReadRepository)

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
   * GET /api/lesson/courses - コース一覧取得
   */
  app.get('/courses', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)

    const [courses, progress] = await Promise.all([
      lessonService.getAllCourses(),
      lessonService.getCoursesProgress(userId),
    ])

    // 進捗をマップ化
    const progressMap = new Map(progress.map((p) => [p.courseId, p]))

    return reply.send({
      data: courses.map((course) => {
        const courseProgress = progressMap.get(course.id)
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          progress: {
            completedLessons: courseProgress?.completedLessons ?? 0,
            totalLessons: courseProgress?.totalLessons ?? 0,
            progressPercent: courseProgress?.progressPercent ?? 0,
          },
          sections: course.sections.map((section) => ({
            id: section.id,
            title: section.title,
            lessons: section.lessons.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              problemCount: lesson.problems.length,
            })),
          })),
        }
      }),
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * GET /api/lesson/courses/:courseId - コース詳細取得
   */
  app.get<{ Params: { courseId: string } }>(
    '/courses/:courseId',
    async (request, reply) => {
      getAuthenticatedUserId(request) // 認証チェック

      const course = await lessonService.getCourseById(request.params.courseId)

      return reply.send({
        data: {
          id: course.id,
          title: course.title,
          description: course.description,
          sections: course.sections.map((section) => ({
            id: section.id,
            title: section.title,
            lessons: section.lessons.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              problemCount: lesson.problems.length,
            })),
          })),
        },
        meta: { timestamp: new Date().toISOString() },
      })
    }
  )

  /**
   * GET /api/lesson/lessons/:lessonId - レッスン詳細取得
   */
  app.get<{ Params: { lessonId: string } }>(
    '/lessons/:lessonId',
    async (request, reply) => {
      getAuthenticatedUserId(request) // 認証チェック

      const lesson = await lessonService.getLessonById(request.params.lessonId)

      return reply.send({
        data: {
          id: lesson.id,
          title: lesson.title,
          sectionId: lesson.sectionId,
          problems: lesson.problems.map((problem) => ({
            id: problem.id,
            sfen: problem.sfen,
            playerTurn: problem.playerTurn,
            moveTree: problem.moveTree,
            instruction: problem.instruction,
          })),
        },
        meta: { timestamp: new Date().toISOString() },
      })
    }
  )

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
