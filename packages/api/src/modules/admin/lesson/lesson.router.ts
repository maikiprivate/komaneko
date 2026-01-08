/**
 * レッスン管理APIルーター
 *
 * 管理者専用のレッスンコンテンツ管理エンドポイント。
 * Course → Section → Lesson → Problem の階層構造をCRUDおよび並び替え。
 */

import type { FastifyInstance } from 'fastify'

import { prisma } from '../../../db/client.js'
import { AppError } from '../../../shared/errors/AppError.js'
import { createAdminMiddleware } from '../../../shared/middleware/admin.middleware.js'
import { createAuthMiddleware } from '../../../shared/middleware/auth.middleware.js'
import { getAuthenticatedUserId } from '../../../shared/utils/getAuthenticatedUserId.js'
import { createAuthRepository } from '../../auth/auth.repository.js'
import { createLessonRepository } from './lesson.repository.js'
import {
  createCourseSchema,
  createLessonSchema,
  createProblemSchema,
  createSectionSchema,
  reorderSchema,
  reorderWithParentSchema,
  updateCourseSchema,
  updateLessonSchema,
  updateProblemSchema,
  updateSectionSchema,
} from './lesson.schema.js'
import { LessonService } from './lesson.service.js'

/** レスポンス用のタイムスタンプを生成 */
function getMeta() {
  return { timestamp: new Date().toISOString() }
}

export async function adminLessonRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const authMiddleware = createAuthMiddleware(authRepository)
  const adminMiddleware = createAdminMiddleware(authRepository)
  const lessonRepository = createLessonRepository(prisma)
  const lessonService = new LessonService(lessonRepository)

  // 認証・認可フック: 全エンドポイントで管理者権限必須
  app.addHook('preHandler', async (request) => {
    // 認証
    request.user = await authMiddleware.authenticate(request.headers.authorization)
    // 管理者認可
    const userId = getAuthenticatedUserId(request)
    await adminMiddleware.authorize(userId)
  })

  // ===========================================================================
  // Course
  // ===========================================================================

  /**
   * GET /courses - 全コース取得（ネスト構造含む）
   */
  app.get('/courses', async (_request, reply) => {
    const courses = await lessonService.getAllCourses()
    return reply.send({ data: courses, meta: getMeta() })
  })

  /**
   * POST /courses - コース作成
   */
  app.post('/courses', async (request, reply) => {
    const parseResult = createCourseSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const course = await lessonService.createCourse(parseResult.data)
    return reply.status(201).send({ data: course, meta: getMeta() })
  })

  /**
   * PUT /courses/reorder - コース並び替え
   * 注意: /courses/:id より先に定義（ルーティング優先度）
   */
  app.put('/courses/reorder', async (request, reply) => {
    const parseResult = reorderSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    await lessonService.reorderCourses(parseResult.data.orderedIds)
    return reply.status(204).send()
  })

  /**
   * PUT /courses/:id - コース更新
   */
  app.put<{ Params: { id: string } }>('/courses/:id', async (request, reply) => {
    const parseResult = updateCourseSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const course = await lessonService.updateCourse(request.params.id, parseResult.data)
    return reply.send({ data: course, meta: getMeta() })
  })

  /**
   * DELETE /courses/:id - コース削除（カスケード: Section, Lesson, Problem も削除）
   */
  app.delete<{ Params: { id: string } }>('/courses/:id', async (request, reply) => {
    await lessonService.deleteCourse(request.params.id)
    return reply.status(204).send()
  })

  // ===========================================================================
  // Section
  // ===========================================================================

  /**
   * POST /sections - セクション作成
   */
  app.post('/sections', async (request, reply) => {
    const parseResult = createSectionSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const section = await lessonService.createSection(parseResult.data)
    return reply.status(201).send({ data: section, meta: getMeta() })
  })

  /**
   * PUT /sections/reorder - セクション並び替え
   * 注意: /sections/:id より先に定義（ルーティング優先度）
   */
  app.put('/sections/reorder', async (request, reply) => {
    const parseResult = reorderWithParentSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    await lessonService.reorderSections(parseResult.data.parentId, parseResult.data.orderedIds)
    return reply.status(204).send()
  })

  /**
   * PUT /sections/:id - セクション更新
   */
  app.put<{ Params: { id: string } }>('/sections/:id', async (request, reply) => {
    const parseResult = updateSectionSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const section = await lessonService.updateSection(request.params.id, parseResult.data)
    return reply.send({ data: section, meta: getMeta() })
  })

  /**
   * DELETE /sections/:id - セクション削除（カスケード: Lesson, Problem も削除）
   */
  app.delete<{ Params: { id: string } }>('/sections/:id', async (request, reply) => {
    await lessonService.deleteSection(request.params.id)
    return reply.status(204).send()
  })

  // ===========================================================================
  // Lesson
  // ===========================================================================

  /**
   * POST /lessons - レッスン作成
   */
  app.post('/lessons', async (request, reply) => {
    const parseResult = createLessonSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const lesson = await lessonService.createLesson(parseResult.data)
    return reply.status(201).send({ data: lesson, meta: getMeta() })
  })

  /**
   * PUT /lessons/reorder - レッスン並び替え
   * 注意: /lessons/:id より先に定義（ルーティング優先度）
   */
  app.put('/lessons/reorder', async (request, reply) => {
    const parseResult = reorderWithParentSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    await lessonService.reorderLessons(parseResult.data.parentId, parseResult.data.orderedIds)
    return reply.status(204).send()
  })

  /**
   * PUT /lessons/:id - レッスン更新
   */
  app.put<{ Params: { id: string } }>('/lessons/:id', async (request, reply) => {
    const parseResult = updateLessonSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const lesson = await lessonService.updateLesson(request.params.id, parseResult.data)
    return reply.send({ data: lesson, meta: getMeta() })
  })

  /**
   * DELETE /lessons/:id - レッスン削除（カスケード: Problem も削除）
   */
  app.delete<{ Params: { id: string } }>('/lessons/:id', async (request, reply) => {
    await lessonService.deleteLesson(request.params.id)
    return reply.status(204).send()
  })

  // ===========================================================================
  // Problem
  // ===========================================================================

  /**
   * GET /problems/:id - 問題詳細取得
   */
  app.get<{ Params: { id: string } }>('/problems/:id', async (request, reply) => {
    const problem = await lessonService.getProblem(request.params.id)
    return reply.send({ data: problem, meta: getMeta() })
  })

  /**
   * POST /problems - 問題作成
   */
  app.post('/problems', async (request, reply) => {
    const parseResult = createProblemSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const problem = await lessonService.createProblem(parseResult.data)
    return reply.status(201).send({ data: problem, meta: getMeta() })
  })

  /**
   * PUT /problems/reorder - 問題並び替え
   * 注意: /problems/:id より先に定義（ルーティング優先度）
   */
  app.put('/problems/reorder', async (request, reply) => {
    const parseResult = reorderWithParentSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    await lessonService.reorderProblems(parseResult.data.parentId, parseResult.data.orderedIds)
    return reply.status(204).send()
  })

  /**
   * PUT /problems/:id - 問題更新
   */
  app.put<{ Params: { id: string } }>('/problems/:id', async (request, reply) => {
    const parseResult = updateProblemSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }
    const problem = await lessonService.updateProblem(request.params.id, parseResult.data)
    return reply.send({ data: problem, meta: getMeta() })
  })

  /**
   * DELETE /problems/:id - 問題削除
   */
  app.delete<{ Params: { id: string } }>('/problems/:id', async (request, reply) => {
    await lessonService.deleteProblem(request.params.id)
    return reply.status(204).send()
  })
}
