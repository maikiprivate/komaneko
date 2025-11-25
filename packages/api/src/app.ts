import Fastify from 'fastify'
import { errorHandler } from './shared/errors/index.js'

export function buildApp() {
  const app = Fastify({
    logger: true,
  })

  // エラーハンドラを登録
  app.setErrorHandler(errorHandler)

  // ルートエンドポイント
  app.get('/', async () => {
    return { message: 'Komaneko API' }
  })

  return app
}
