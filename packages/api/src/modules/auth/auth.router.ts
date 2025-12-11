/**
 * 認証APIルーター
 */

import type { FastifyInstance } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthRepository } from './auth.repository.js'
import { loginSchema, registerSchema } from './auth.schema.js'
import { AuthService } from './auth.service.js'

export async function authRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const repository = createAuthRepository(prisma)
  const authService = new AuthService(repository)

  /**
   * POST /api/auth/register - 新規登録
   */
  app.post('/register', async (request, reply) => {
    // バリデーション
    const parseResult = registerSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const result = await authService.register(parseResult.data)

    return reply.status(201).send({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * POST /api/auth/login - ログイン
   */
  app.post('/login', async (request, reply) => {
    // バリデーション
    const parseResult = loginSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const result = await authService.login(parseResult.data)

    return reply.send({
      data: result,
      meta: { timestamp: new Date().toISOString() },
    })
  })

  // TODO: 認証ミドルウェア実装後に追加
  // - POST /api/auth/logout
  // - GET /api/auth/me
  // - DELETE /api/auth/me
  //
  // 重要: 認証ミドルウェアではJWTの検証に加えて、
  // DBセッションの存在確認も行うこと。
  // これによりログアウト後のJWTを無効化できる。
}
