/**
 * JWTユーティリティのテスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '../errors/AppError.js'
import { generateAccessToken, verifyAccessToken } from './jwt.js'

describe('jwt', () => {
  const mockUserId = 'user-123'

  describe('generateAccessToken', () => {
    it('アクセストークンを生成できる', () => {
      const token = generateAccessToken(mockUserId)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT形式（header.payload.signature）
    })
  })

  describe('verifyAccessToken', () => {
    it('有効なトークンを検証できる', () => {
      const token = generateAccessToken(mockUserId)
      const payload = verifyAccessToken(token)

      expect(payload.userId).toBe(mockUserId)
    })

    it('不正なトークンでINVALID_TOKENエラーをスローする', () => {
      const invalidToken = 'invalid.token.here'

      expect(() => verifyAccessToken(invalidToken)).toThrow(AppError)
      try {
        verifyAccessToken(invalidToken)
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).code).toBe('INVALID_TOKEN')
      }
    })

    it('改ざんされたトークンでINVALID_TOKENエラーをスローする', () => {
      const token = generateAccessToken(mockUserId)
      const tamperedToken = token.slice(0, -5) + 'xxxxx'

      expect(() => verifyAccessToken(tamperedToken)).toThrow(AppError)
      try {
        verifyAccessToken(tamperedToken)
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).code).toBe('INVALID_TOKEN')
      }
    })
  })

  describe('トークンの有効期限', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('期限切れトークンでTOKEN_EXPIREDエラーをスローする', () => {
      const token = generateAccessToken(mockUserId)

      // 31日後に進める（トークンは30日有効）
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000)

      expect(() => verifyAccessToken(token)).toThrow(AppError)
      try {
        verifyAccessToken(token)
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).code).toBe('TOKEN_EXPIRED')
      }
    })

    it('期限内のトークンは検証が成功する', () => {
      const token = generateAccessToken(mockUserId)

      // 29日後に進める（トークンは30日有効）
      vi.advanceTimersByTime(29 * 24 * 60 * 60 * 1000)

      const payload = verifyAccessToken(token)
      expect(payload.userId).toBe(mockUserId)
    })
  })

  describe('本番環境でのJWT_SECRET', () => {
    const originalEnv = process.env.NODE_ENV
    const originalSecret = process.env.JWT_SECRET

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
      if (originalSecret) {
        process.env.JWT_SECRET = originalSecret
      } else {
        delete process.env.JWT_SECRET
      }
    })

    it('本番環境でJWT_SECRETが未設定の場合はMISSING_JWT_SECRETエラーをスローする', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.JWT_SECRET

      expect(() => generateAccessToken(mockUserId)).toThrow(AppError)
      try {
        generateAccessToken(mockUserId)
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).code).toBe('MISSING_JWT_SECRET')
      }
    })

    it('本番環境でJWT_SECRETが設定されている場合は正常に動作する', () => {
      process.env.NODE_ENV = 'production'
      process.env.JWT_SECRET = 'test-production-secret'

      const token = generateAccessToken(mockUserId)
      const payload = verifyAccessToken(token)

      expect(payload.userId).toBe(mockUserId)
    })
  })
})
