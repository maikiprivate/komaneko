import Fastify from 'fastify'

export function buildApp() {
  const app = Fastify({
    logger: true,
  })

  // ルートエンドポイント
  app.get('/', async () => {
    return { message: 'Komaneko API' }
  })

  return app
}
