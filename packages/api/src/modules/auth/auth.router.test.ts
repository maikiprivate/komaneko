/**
 * 認証ルーターのテスト
 *
 * preHandlerフックによる認証の動作を検証
 */

import { describe, expect, it } from 'vitest'

import { buildApp } from '../../app.js'

describe('AuthRouter', () => {
  describe('認証不要なルート（PUBLIC_ROUTES）', () => {
    it('POST /api/auth/register は認証なしでアクセス可能', async () => {
      const app = await buildApp()

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123',
          username: 'testuser',
        },
      })

      // 認証エラー（401）ではないことを確認
      // 入力エラーや重複エラーは許容
      expect(response.statusCode).not.toBe(401)
    })

    it('POST /api/auth/login は認証なしでアクセス可能', async () => {
      const app = await buildApp()

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Password123',
        },
      })

      // 401でもINVALID_CREDENTIALSなら認証は通っている
      // UNAUTHORIZEDの場合は認証フックで弾かれている
      const body = JSON.parse(response.body)
      if (response.statusCode === 401) {
        // INVALID_CREDENTIALSは認証フック通過後の正常動作
        expect(body.error.code).toBe('INVALID_CREDENTIALS')
      }
    })
  })

  describe('認証必須なルート', () => {
    it('POST /api/auth/logout は認証なしで401エラー', async () => {
      const app = await buildApp()

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      })

      expect(response.statusCode).toBe(401)
    })

    it('GET /api/auth/me は認証なしで401エラー', async () => {
      const app = await buildApp()

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      })

      expect(response.statusCode).toBe(401)
    })

    it('DELETE /api/auth/me は認証なしで401エラー', async () => {
      const app = await buildApp()

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/auth/me',
      })

      expect(response.statusCode).toBe(401)
    })

    it('無効なトークンで401エラー', async () => {
      const app = await buildApp()

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
