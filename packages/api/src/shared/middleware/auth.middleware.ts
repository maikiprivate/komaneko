/**
 * 認証ミドルウェア
 *
 * JWT検証とDBセッション確認を行い、認証済みユーザー情報を返す。
 * ログアウト後のJWT無効化に対応するため、DBセッションの存在確認も必須。
 */

import type { Session } from '@prisma/client'

import { AppError } from '../errors/AppError.js'
import { verifyAccessToken } from '../utils/jwt.js'

/** 認証済みユーザー情報 */
export interface AuthenticatedUser {
  userId: string
}

/** ミドルウェアで使用するリポジトリ */
export interface AuthMiddlewareRepository {
  findActiveSessionByUserId(userId: string): Promise<Session | null>
}

/**
 * 認証ミドルウェアを作成
 */
export function createAuthMiddleware(repository: AuthMiddlewareRepository) {
  return {
    /**
     * 認証を行う
     * @param authHeader Authorizationヘッダーの値
     * @returns 認証済みユーザー情報
     * @throws AppError 認証失敗時
     */
    async authenticate(authHeader: string | undefined): Promise<AuthenticatedUser> {
      // 1. Authorizationヘッダーの検証
      if (!authHeader) {
        throw new AppError('UNAUTHORIZED')
      }

      // 2. Bearerスキームの検証
      if (!authHeader.startsWith('Bearer ')) {
        throw new AppError('UNAUTHORIZED')
      }

      // 3. トークンの抽出
      const token = authHeader.slice(7) // 'Bearer '.length === 7
      if (!token) {
        throw new AppError('UNAUTHORIZED')
      }

      // 4. JWTの検証（署名・有効期限）
      const payload = verifyAccessToken(token)

      // 5. DBセッションの確認（ログアウト後の無効化対応）
      const session = await repository.findActiveSessionByUserId(payload.userId)
      if (!session) {
        throw new AppError('SESSION_EXPIRED')
      }

      // 6. セッションの有効期限確認
      if (session.expiresAt < new Date()) {
        throw new AppError('SESSION_EXPIRED')
      }

      return { userId: payload.userId }
    },
  }
}
