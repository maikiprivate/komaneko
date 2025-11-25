import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { prisma } from './db/client.js'
import { errorHandler } from './shared/errors/index.js'

const isDev = process.env.NODE_ENV !== 'production'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: isDev ? 'debug' : 'info',
    },
    genReqId: () => randomUUID(),
  })

  // エラーハンドラを登録
  app.setErrorHandler(errorHandler)

  // ルートエンドポイント
  app.get('/', async () => {
    return { message: 'Komaneko API' }
  })

  // ヘルスチェック
  app.get('/api/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        db: 'connected',
      }
    } catch {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        db: 'disconnected',
      }
    }
  })

  return app
}
