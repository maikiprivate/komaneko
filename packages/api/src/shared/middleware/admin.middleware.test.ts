/**
 * 管理者認可ミドルウェアのテスト
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AdminMiddlewareRepository,
  createAdminMiddleware,
} from './admin.middleware.js'

describe('AdminMiddleware', () => {
  let mockRepository: AdminMiddlewareRepository
  let middleware: ReturnType<typeof createAdminMiddleware>

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
    }
    middleware = createAdminMiddleware(mockRepository)
  })

  describe('authorize', () => {
    it('role=admin のユーザーは認可成功', async () => {
      const userId = 'user-123'

      vi.mocked(mockRepository.findUserById).mockResolvedValue({
        id: userId,
        role: 'admin',
      })

      await expect(middleware.authorize(userId)).resolves.toBeUndefined()
      expect(mockRepository.findUserById).toHaveBeenCalledWith(userId)
    })

    it('role=user のユーザーは FORBIDDEN エラー', async () => {
      const userId = 'user-123'

      vi.mocked(mockRepository.findUserById).mockResolvedValue({
        id: userId,
        role: 'user',
      })

      await expect(middleware.authorize(userId)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('ユーザーが存在しない場合は FORBIDDEN エラー', async () => {
      const userId = 'non-existent'

      vi.mocked(mockRepository.findUserById).mockResolvedValue(null)

      await expect(middleware.authorize(userId)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('role が空文字の場合は FORBIDDEN エラー', async () => {
      const userId = 'user-123'

      vi.mocked(mockRepository.findUserById).mockResolvedValue({
        id: userId,
        role: '',
      })

      await expect(middleware.authorize(userId)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })
})
