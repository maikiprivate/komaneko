/**
 * 認証サービス（ビジネスロジック）
 */

import { randomUUID } from 'crypto'

import { AppError } from '../../shared/errors/AppError.js'
import { generateAccessToken } from '../../shared/utils/jwt.js'
import { hashPassword, verifyPassword } from '../../shared/utils/password.js'
import type { AuthRepository } from './auth.repository.js'

/** セッション有効期限（日数） */
const SESSION_EXPIRES_DAYS = 30

interface RegisterInput {
  email: string
  password: string
  username: string
}

interface LoginInput {
  email: string
  password: string
}

interface AuthResult {
  user: {
    id: string
    email: string
    username: string
  }
  accessToken: string
}

export class AuthService {
  constructor(private repository: AuthRepository) {}

  /**
   * 新規ユーザー登録
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    // メールアドレスの重複チェック
    const existingEmail = await this.repository.findUserByEmail(input.email)
    if (existingEmail) {
      throw new AppError('EMAIL_ALREADY_EXISTS')
    }

    // ユーザー名の重複チェック
    const existingUsername = await this.repository.findUserByUsername(input.username)
    if (existingUsername) {
      throw new AppError('USERNAME_ALREADY_EXISTS')
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(input.password)

    // ユーザー作成
    const user = await this.repository.createUser({
      email: input.email,
      username: input.username,
      passwordHash,
    })

    // 登録時はemail/usernameは必ず設定されている
    if (!user.email || !user.username) {
      throw new AppError('INTERNAL_ERROR')
    }

    // セッション作成（ログアウト時の無効化用にDBに保存）
    const sessionToken = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRES_DAYS)

    await this.repository.createSession({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    })

    // JWTトークン生成
    const accessToken = generateAccessToken(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      accessToken,
    }
  }

  /**
   * ログイン
   */
  async login(input: LoginInput): Promise<AuthResult> {
    // ユーザー検索
    const user = await this.repository.findUserByEmail(input.email)
    if (!user || !user.passwordHash) {
      throw new AppError('INVALID_CREDENTIALS')
    }

    // パスワード検証
    const isValid = await verifyPassword(input.password, user.passwordHash)
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS')
    }

    // ログイン済みユーザーはemail/usernameが必ず設定されている
    if (!user.email || !user.username) {
      throw new AppError('INVALID_CREDENTIALS')
    }

    // 既存セッション削除（シングルセッション制限）
    await this.repository.deleteSessionsByUserId(user.id)

    // 新規セッション作成（ログアウト時の無効化用にDBに保存）
    const sessionToken = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRES_DAYS)

    await this.repository.createSession({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    })

    // JWTトークン生成
    const accessToken = generateAccessToken(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      accessToken,
    }
  }

  /**
   * ログアウト
   */
  async logout(userId: string): Promise<void> {
    await this.repository.deleteSessionsByUserId(userId)
  }

  /**
   * アカウント削除（退会）
   */
  async deleteAccount(userId: string): Promise<void> {
    // セッションを明示的に削除（Cascade設定があるが意図を明確化）
    await this.repository.deleteSessionsByUserId(userId)
    await this.repository.deleteUser(userId)
  }
}
