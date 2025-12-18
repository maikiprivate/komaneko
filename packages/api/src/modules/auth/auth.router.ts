/**
 * 認証APIルーター
 */

import type { FastifyInstance } from 'fastify'

import { prisma } from '../../db/client.js'
import { AppError } from '../../shared/errors/AppError.js'
import { createAuthMiddleware } from '../../shared/middleware/auth.middleware.js'
import { getAuthenticatedUserId } from '../../shared/utils/getAuthenticatedUserId.js'
import { createAuthRepository } from './auth.repository.js'
import { loginSchema, registerSchema } from './auth.schema.js'
import { AuthService } from './auth.service.js'

// Fastifyの型拡張は src/types/fastify.d.ts で定義

/** 認証不要なルート（明示的に除外） */
const PUBLIC_ROUTES = ['/register', '/login']

export async function authRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const repository = createAuthRepository(prisma)
  const authService = new AuthService(repository)
  const authMiddleware = createAuthMiddleware(repository)

  // 認証フック: PUBLIC_ROUTES以外は自動的に認証を要求
  app.addHook('preHandler', async (request) => {
    // request.urlから認証不要ルートをチェック
    // /api/auth/register -> /register にマッチさせるため、prefixを除去
    const urlPath = request.url.split('?')[0] ?? '' // クエリパラメータを除去
    const routePath = urlPath.replace(/^\/api\/auth/, '') // prefix除去
    if (PUBLIC_ROUTES.includes(routePath)) {
      return
    }
    request.user = await authMiddleware.authenticate(request.headers.authorization)
  })

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

  /**
   * POST /api/auth/logout - ログアウト
   * 認証必須（preHandlerで自動認証）
   */
  app.post('/logout', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)
    await authService.logout(userId)

    return reply.send({
      data: { message: 'ログアウトしました' },
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * GET /api/auth/me - 現在のユーザー情報取得
   * 認証必須（preHandlerで自動認証）
   */
  app.get('/me', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)
    const user = await authService.getCurrentUser(userId)

    return reply.send({
      data: { user },
      meta: { timestamp: new Date().toISOString() },
    })
  })

  /**
   * DELETE /api/auth/me - アカウント削除（退会）
   * 認証必須（preHandlerで自動認証）
   */
  app.delete('/me', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)
    await authService.deleteAccount(userId)

    return reply.send({
      data: { message: 'アカウントを削除しました' },
      meta: { timestamp: new Date().toISOString() },
    })
  })
}
