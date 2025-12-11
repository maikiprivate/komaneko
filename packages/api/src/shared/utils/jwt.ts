/**
 * JWT生成・検証ユーティリティ
 */

import jwt from 'jsonwebtoken'
import type { Secret, SignOptions } from 'jsonwebtoken'
import { z } from 'zod'

import { AppError } from '../errors/AppError.js'

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '30d') as string

/**
 * JWT_SECRETを取得する
 * 本番環境では環境変数の設定を必須とする
 */
function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('MISSING_JWT_SECRET')
    }
    return 'dev-secret-key-change-in-production'
  }

  return secret
}

/**
 * JWTペイロードのZodスキーマ
 * userIdのみを含める（email/usernameはDBから取得）
 */
const jwtPayloadSchema = z.object({
  userId: z.string(),
})

export interface JwtPayload {
  userId: string
}

/**
 * アクセストークンを生成する
 */
export function generateAccessToken(userId: string): string {
  const payload: JwtPayload = {
    userId,
  }

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions)
}

/**
 * アクセストークンを検証する
 * @throws AppError トークンが無効または期限切れの場合
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    // ペイロードの構造を検証
    const result = jwtPayloadSchema.safeParse(decoded)
    if (!result.success) {
      throw new AppError('INVALID_TOKEN')
    }

    return result.data
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    // jsonwebtokenのエラーはnameプロパティで判別
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('TOKEN_EXPIRED')
      }
    }
    // その他の予期せぬエラーも INVALID_TOKEN として扱う
    throw new AppError('INVALID_TOKEN')
  }
}
