import { randomUUID } from 'node:crypto'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { prisma } from './db/client.js'
import { authRouter } from './modules/auth/auth.router.js'
import { heartsRouter } from './modules/hearts/hearts.router.js'
import { errorHandler } from './shared/errors/index.js'

const isDev = process.env.NODE_ENV !== 'production'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: isDev ? 'debug' : 'info',
    },
    genReqId: () => randomUUID(),
  })

  // CORS設定
  await app.register(cors, {
    origin: isDev ? true : process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true,
  })

  // レート制限（1分間に100リクエストまで）
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // エラーハンドラを登録
  app.setErrorHandler(errorHandler)

  // ルートエンドポイント
  app.get('/', async () => {
    return { message: 'Komaneko API' }
  })

  // ヘルスチェック
  app.get('/api/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        db: 'connected',
      }
    } catch {
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        db: 'disconnected',
      })
    }
  })

  // 認証API
  await app.register(authRouter, { prefix: '/api/auth' })

  // ハートAPI
  await app.register(heartsRouter, { prefix: '/api/hearts' })

  return app
}
