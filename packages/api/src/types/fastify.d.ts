/**
 * Fastifyの型拡張
 *
 * 認証ミドルウェアで設定される追加プロパティの型定義
 */

import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    /** 認証済みユーザー情報（preHandlerで設定） */
    user?: { userId: string }
  }
}
