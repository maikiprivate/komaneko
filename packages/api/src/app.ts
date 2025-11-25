import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
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

  return app
}
