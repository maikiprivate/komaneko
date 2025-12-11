/**
 * 認証サービスのテスト（TDD）
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hashPassword } from '../../shared/utils/password.js'
import { AuthService } from './auth.service.js'
import type { AuthRepository } from './auth.repository.js'

describe('AuthService', () => {
  let authService: AuthService
  let mockRepository: AuthRepository

  beforeEach(() => {
    // モックリポジトリを作成
    mockRepository = {
      findUserByEmail: vi.fn(),
      findUserByUsername: vi.fn(),
      findUserById: vi.fn(),
      findActiveSessionByUserId: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      createSession: vi.fn(),
      deleteSessionsByUserId: vi.fn(),
    }
    authService = new AuthService(mockRepository)
  })

  describe('register', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
    }

    it('新規ユーザーを登録できる', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: validInput.email,
        username: validInput.username,
        passwordHash: 'hashed-password',
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.findUserByUsername).mockResolvedValue(null)
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createSession).mockResolvedValue({
        id: 'session-123',
        userId: mockUser.id,
        token: 'session-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      // Act
      const result = await authService.register(validInput)

      // Assert
      expect(result.user.id).toBe(mockUser.id)
      expect(result.user.email).toBe(validInput.email)
      expect(result.user.username).toBe(validInput.username)
      expect(result.accessToken).toBeDefined()
      expect(typeof result.accessToken).toBe('string')
    })

    it('メールアドレスが既に使用されている場合はEMAIL_ALREADY_EXISTSエラーをスローする', async () => {
      // Arrange
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue({
        id: 'existing-user',
        email: validInput.email,
        username: 'existinguser',
        passwordHash: 'hash',
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act & Assert
      await expect(authService.register(validInput)).rejects.toMatchObject({
        code: 'EMAIL_ALREADY_EXISTS',
      })
    })

    it('ユーザー名が既に使用されている場合はUSERNAME_ALREADY_EXISTSエラーをスローする', async () => {
      // Arrange
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.findUserByUsername).mockResolvedValue({
        id: 'existing-user',
        email: 'other@example.com',
        username: validInput.username,
        passwordHash: 'hash',
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act & Assert
      await expect(authService.register(validInput)).rejects.toMatchObject({
        code: 'USERNAME_ALREADY_EXISTS',
      })
    })
  })

  describe('login', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'Password123',
    }

    it('正しい認証情報でログインできる', async () => {
      // Arrange
      // 実際にbcryptjsでハッシュ化
      const hashedPassword = await hashPassword(validInput.password)
      const mockUser = {
        id: 'user-123',
        email: validInput.email,
        username: 'testuser',
        passwordHash: hashedPassword,
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.deleteSessionsByUserId).mockResolvedValue()
      vi.mocked(mockRepository.createSession).mockResolvedValue({
        id: 'session-123',
        userId: mockUser.id,
        token: 'session-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      // Act
      const result = await authService.login(validInput)

      // Assert
      expect(result.user.id).toBe(mockUser.id)
      expect(result.user.email).toBe(validInput.email)
      expect(result.accessToken).toBeDefined()
    })

    it('存在しないユーザーでログインするとINVALID_CREDENTIALSエラーをスローする', async () => {
      // Arrange
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      // Act & Assert
      await expect(authService.login(validInput)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('パスワードが間違っているとINVALID_CREDENTIALSエラーをスローする', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: validInput.email,
        username: 'testuser',
        passwordHash: '$2a$12$differenthash',
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)

      // Act & Assert
      await expect(authService.login(validInput)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('パスワードが未設定のユーザーでログインするとINVALID_CREDENTIALSエラーをスローする', async () => {
      // Arrange（匿名ユーザーなど）
      const mockUser = {
        id: 'user-123',
        email: validInput.email,
        username: 'testuser',
        passwordHash: null,
        isAnonymous: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)

      // Act & Assert
      await expect(authService.login(validInput)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })
  })

  describe('logout', () => {
    it('ログアウト時にセッションを削除する', async () => {
      // Arrange
      const userId = 'user-123'
      vi.mocked(mockRepository.deleteSessionsByUserId).mockResolvedValue()

      // Act
      await authService.logout(userId)

      // Assert
      expect(mockRepository.deleteSessionsByUserId).toHaveBeenCalledWith(userId)
      expect(mockRepository.deleteSessionsByUserId).toHaveBeenCalledTimes(1)
    })

    it('セッションが存在しなくてもエラーにならない', async () => {
      // Arrange（セッションなしでも正常終了）
      const userId = 'user-without-session'
      vi.mocked(mockRepository.deleteSessionsByUserId).mockResolvedValue()

      // Act & Assert
      await expect(authService.logout(userId)).resolves.toBeUndefined()
    })
  })

  describe('deleteAccount', () => {
    it('アカウント削除時にセッションとユーザーを削除する', async () => {
      // Arrange
      const userId = 'user-123'
      vi.mocked(mockRepository.deleteSessionsByUserId).mockResolvedValue()
      vi.mocked(mockRepository.deleteUser).mockResolvedValue()

      // Act
      await authService.deleteAccount(userId)

      // Assert
      expect(mockRepository.deleteSessionsByUserId).toHaveBeenCalledWith(userId)
      expect(mockRepository.deleteUser).toHaveBeenCalledWith(userId)
      // セッション削除が先に呼ばれることを確認
      expect(mockRepository.deleteSessionsByUserId).toHaveBeenCalledTimes(1)
      expect(mockRepository.deleteUser).toHaveBeenCalledTimes(1)
    })

    it('存在しないユーザーでもリポジトリに委譲する', async () => {
      // Arrange（リポジトリがエラーをスローしなければ成功）
      const userId = 'non-existent-user'
      vi.mocked(mockRepository.deleteSessionsByUserId).mockResolvedValue()
      vi.mocked(mockRepository.deleteUser).mockResolvedValue()

      // Act & Assert
      await expect(authService.deleteAccount(userId)).resolves.toBeUndefined()
    })
  })

  describe('getCurrentUser', () => {
    it('存在するユーザーの情報を取得できる', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed-password',
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findUserById).mockResolvedValue(mockUser)

      // Act
      const result = await authService.getCurrentUser('user-123')

      // Assert
      expect(result.id).toBe('user-123')
      expect(result.email).toBe('test@example.com')
      expect(result.username).toBe('testuser')
      expect(mockRepository.findUserById).toHaveBeenCalledWith('user-123')
    })

    it('存在しないユーザーでUSER_NOT_FOUNDエラーをスローする', async () => {
      // Arrange
      vi.mocked(mockRepository.findUserById).mockResolvedValue(null)

      // Act & Assert
      await expect(authService.getCurrentUser('non-existent-user')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      })
    })

    it('emailが未設定のユーザーでUSER_NOT_FOUNDエラーをスローする', async () => {
      // Arrange（匿名ユーザーなど）
      const mockUser = {
        id: 'user-123',
        email: null,
        username: 'testuser',
        passwordHash: null,
        isAnonymous: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findUserById).mockResolvedValue(mockUser)

      // Act & Assert
      await expect(authService.getCurrentUser('user-123')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      })
    })

    it('usernameが未設定のユーザーでUSER_NOT_FOUNDエラーをスローする', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: null,
        passwordHash: null,
        isAnonymous: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findUserById).mockResolvedValue(mockUser)

      // Act & Assert
      await expect(authService.getCurrentUser('user-123')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      })
    })
  })
})
