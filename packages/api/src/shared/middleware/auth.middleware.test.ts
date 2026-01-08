/**
 * 認証ミドルウェアのテスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateAccessToken } from '../utils/jwt.js'
import { type AuthMiddlewareRepository, createAuthMiddleware } from './auth.middleware.js'

describe('AuthMiddleware', () => {
  let mockRepository: AuthMiddlewareRepository
  let middleware: ReturnType<typeof createAuthMiddleware>

  beforeEach(() => {
    mockRepository = {
      findActiveSessionByUserId: vi.fn(),
    }
    middleware = createAuthMiddleware(mockRepository)
  })

  describe('authenticate', () => {
    it('有効なトークンとセッションで認証が成功する', async () => {
      const userId = 'user-123'
      const token = generateAccessToken(userId)
      const authHeader = `Bearer ${token}`

      // セッションが存在する
      vi.mocked(mockRepository.findActiveSessionByUserId).mockResolvedValue({
        id: 'session-1',
        userId,
        token: 'session-token',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24時間後
        createdAt: new Date(),
      })

      const result = await middleware.authenticate(authHeader)

      expect(result).toEqual({ userId })
      expect(mockRepository.findActiveSessionByUserId).toHaveBeenCalledWith(userId)
    })

    it('Authorizationヘッダーがない場合はエラー', async () => {
      await expect(middleware.authenticate(undefined)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('Bearerスキームでない場合はエラー', async () => {
      await expect(middleware.authenticate('Basic abc123')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('トークンが空の場合はエラー', async () => {
      await expect(middleware.authenticate('Bearer ')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('無効なトークンの場合はエラー', async () => {
      await expect(middleware.authenticate('Bearer invalid-token')).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
      })
    })

    it('セッションが存在しない場合はエラー（ログアウト済み）', async () => {
      const userId = 'user-123'
      const token = generateAccessToken(userId)
      const authHeader = `Bearer ${token}`

      // セッションが存在しない
      vi.mocked(mockRepository.findActiveSessionByUserId).mockResolvedValue(null)

      await expect(middleware.authenticate(authHeader)).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
      })
    })

    it('セッションの有効期限が切れている場合はエラー', async () => {
      const userId = 'user-123'
      const token = generateAccessToken(userId)
      const authHeader = `Bearer ${token}`

      // 期限切れのセッション
      vi.mocked(mockRepository.findActiveSessionByUserId).mockResolvedValue({
        id: 'session-1',
        userId,
        token: 'session-token',
        expiresAt: new Date(Date.now() - 1000), // 過去
        createdAt: new Date(),
      })

      await expect(middleware.authenticate(authHeader)).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
      })
    })
  })
})
