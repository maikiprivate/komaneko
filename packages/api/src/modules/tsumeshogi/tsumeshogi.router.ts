/**
 * 詰将棋APIルーター
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
import { createTsumeshogiRepository } from './tsumeshogi.repository.js'
import {
  recordTsumeshogiSchema,
  tsumeshogiQuerySchema,
} from './tsumeshogi.schema.js'
import { TsumeshogiService } from './tsumeshogi.service.js'

export async function tsumeshogiRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const tsumeshogiRepository = createTsumeshogiRepository(prisma)
  const tsumeshogiService = new TsumeshogiService(tsumeshogiRepository)
  const authMiddleware = createAuthMiddleware(authRepository)

  // LearningService（POST /record用）
  const learningRecordRepository = createLearningRecordRepository(prisma)
  const heartsRepository = createHeartsRepository(prisma)
  const heartsService = new HeartsService(heartsRepository)
  const learningService = new LearningService(
    learningRecordRepository,
    heartsService
  )

  // 認証フック: 全エンドポイントで認証必須
  app.addHook('preHandler', async (request) => {
    request.user = await authMiddleware.authenticate(request.headers.authorization)
  })

  /**
   * GET /api/tsumeshogi - 一覧取得（カーソルベースページネーション）
   */
  app.get('/', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)

    // クエリパラメータのバリデーション
    const parseResult = tsumeshogiQuerySchema.safeParse(request.query)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { moveCount, statusFilter, limit, afterNumber } = parseResult.data

    // getAllWithCountで問題一覧と件数を一度に取得（IDリスト取得の重複を削減）
    // statusFilter: allの場合のみstatusMapを取得（フィルタ済みの場合は不要）
    const [{ problems, total }, statusMap] = await Promise.all([
      tsumeshogiService.getAllWithCount({ moveCount, statusFilter, userId, limit, afterNumber }),
      statusFilter === 'all'
        ? tsumeshogiService.getStatusMap(userId)
        : Promise.resolve(new Map()),
    ])

    // ステータスの決定: statusFilterがall以外の場合はフィルタ値をそのまま使用
    const getStatus = (problemId: string) => {
      if (statusFilter === 'all') {
        return statusMap.get(problemId) ?? 'unsolved'
      }
      return statusFilter
    }

    // hasMore: 取得件数がlimitと同じなら追加データの可能性あり
    // （最後のページがちょうどlimit件の場合でも、次回は空配列が返るだけなので問題なし）
    const hasMore = problems.length === limit

    return reply.send({
      data: problems.map((p) => ({
        id: p.id,
        sfen: p.sfen,
        moveCount: p.moveCount,
        problemNumber: p.problemNumber,
        status: getStatus(p.id),
      })),
      pagination: {
        total,
        limit,
        hasMore,
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * GET /api/tsumeshogi/:id - 詳細取得
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)

    const [problem, statusMap] = await Promise.all([
      tsumeshogiService.getById(request.params.id),
      tsumeshogiService.getStatusMap(userId),
    ])

    return reply.send({
      data: {
        id: problem.id,
        sfen: problem.sfen,
        moveCount: problem.moveCount,
        problemNumber: problem.problemNumber,
        status: statusMap.get(problem.id) ?? 'unsolved',
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * POST /api/tsumeshogi/record - 学習記録
   *
   * 詰将棋の学習結果を記録し、ハート消費とストリーク更新を行う。
   * ハート消費量はサーバー側で決定（現状: 常に1ハート）。
   */
  app.post('/record', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)

    // バリデーション
    const parseResult = recordTsumeshogiSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { tsumeshogiId, isCorrect } = parseResult.data

    // 詰将棋の存在確認（存在しない場合はエラー）
    await tsumeshogiService.getById(tsumeshogiId)

    // サーバー側でハート消費を決定（正解時のみ1ハート消費）
    const result = await learningService.recordCompletion(userId, {
      consumeHeart: isCorrect,
      contentType: 'tsumeshogi',
      contentId: tsumeshogiId,
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
