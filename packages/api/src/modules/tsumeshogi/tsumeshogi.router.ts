/**
 * 詰将棋APIルーター
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthMiddleware } from '../../shared/middleware/auth.middleware.js'
import { createAuthRepository } from '../auth/auth.repository.js'
import { createTsumeshogiRepository } from './tsumeshogi.repository.js'
import { tsumeshogiQuerySchema } from './tsumeshogi.schema.js'
import { TsumeshogiService } from './tsumeshogi.service.js'

/**
 * 認証済みユーザーIDを取得するヘルパー
 */
function getAuthenticatedUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new AppError('UNAUTHORIZED')
  }
  return request.user.userId
}

export async function tsumeshogiRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const tsumeshogiRepository = createTsumeshogiRepository(prisma)
  const tsumeshogiService = new TsumeshogiService(tsumeshogiRepository)
  const authMiddleware = createAuthMiddleware(authRepository)

  // 認証フック: 全エンドポイントで認証必須
  app.addHook('preHandler', async (request) => {
    request.user = await authMiddleware.authenticate(request.headers.authorization)
  })

  /**
   * GET /api/tsumeshogi - 一覧取得
   */
  app.get('/', async (request, reply) => {
    getAuthenticatedUserId(request) // 認証チェック

    // クエリパラメータのバリデーション
    const parseResult = tsumeshogiQuerySchema.safeParse(request.query)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const problems = await tsumeshogiService.getAll(parseResult.data)

    return reply.send({
      data: problems.map((p) => ({
        id: p.id,
        sfen: p.sfen,
        moveCount: p.moveCount,
      })),
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * GET /api/tsumeshogi/:id - 詳細取得
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    getAuthenticatedUserId(request) // 認証チェック

    const problem = await tsumeshogiService.getById(request.params.id)

    return reply.send({
      data: {
        id: problem.id,
        sfen: problem.sfen,
        moveCount: problem.moveCount,
      },
      meta: { timestamp: new Date().toISOString() },
    })
  })
}
