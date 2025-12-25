/**
 * 管理者認可ミドルウェア
 *
 * ユーザーのroleがadminであることを確認する。
 * 認証ミドルウェアの後に使用する。
 */

import { AppError } from '../errors/AppError.js'

/** ユーザー情報（認可チェックに必要な最小限） */
interface UserForAuthorization {
  id: string
  role: string
}

/** ミドルウェアで使用するリポジトリ */
export interface AdminMiddlewareRepository {
  findUserById(userId: string): Promise<UserForAuthorization | null>
}

/**
 * 管理者認可ミドルウェアを作成
 */
export function createAdminMiddleware(repository: AdminMiddlewareRepository) {
  return {
    /**
     * 管理者権限を確認
     * @param userId 認証済みユーザーID
     * @throws AppError 認可失敗時（FORBIDDEN）
     */
    async authorize(userId: string): Promise<void> {
      const user = await repository.findUserById(userId)

      if (!user) {
        throw new AppError('FORBIDDEN')
      }

      if (user.role !== 'admin') {
        throw new AppError('FORBIDDEN')
      }
    },
  }
}
