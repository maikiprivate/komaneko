/**
 * 認証サービス（ビジネスロジック）
 */

import { randomUUID } from 'crypto'

import { Prisma } from '@prisma/client'

import { AppError } from '../../shared/errors/AppError.js'
import { generateAccessToken } from '../../shared/utils/jwt.js'
import { hashPassword, verifyPassword } from '../../shared/utils/password.js'
import type { AuthRepository } from './auth.repository.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'

/** セッション有効期限（日数） */
const SESSION_EXPIRES_DAYS = 30

interface AuthResult {
  user: {
    id: string
    email: string
    username: string
    role: string
  }
  accessToken: string
}

export class AuthService {
  constructor(private repository: AuthRepository) {}

  /**
   * ユーザーのセッションを作成する（内部メソッド）
   */
  private async createSessionForUser(userId: string): Promise<void> {
    const sessionToken = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRES_DAYS)

    await this.repository.createSession({
      userId,
      token: sessionToken,
      expiresAt,
    })
  }

  /**
   * 新規ユーザー登録
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    // メールアドレスとユーザー名の重複チェック（並列実行）
    const [existingEmail, existingUsername] = await Promise.all([
      this.repository.findUserByEmail(input.email),
      this.repository.findUserByUsername(input.username),
    ])

    if (existingEmail) {
      throw new AppError('EMAIL_ALREADY_EXISTS')
    }
    if (existingUsername) {
      throw new AppError('USERNAME_ALREADY_EXISTS')
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(input.password)

    // ユーザー作成（レースコンディション対策: DB一意制約違反をキャッチ）
    let user
    try {
      user = await this.repository.createUser({
        email: input.email,
        username: input.username,
        passwordHash,
      })
    } catch (error) {
      // Prismaの一意制約違反エラー（P2002）をAppErrorに変換
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined
        if (target?.includes('email')) {
          throw new AppError('EMAIL_ALREADY_EXISTS')
        }
        if (target?.includes('username')) {
          throw new AppError('USERNAME_ALREADY_EXISTS')
        }
        // どちらか特定できない場合はメールアドレス重複としてエラー
        throw new AppError('EMAIL_ALREADY_EXISTS')
      }
      throw error
    }

    // 登録時はemail/usernameは必ず設定されている
    if (!user.email || !user.username) {
      throw new AppError('INTERNAL_ERROR')
    }

    // セッション作成
    await this.createSessionForUser(user.id)

    // JWTトークン生成
    const accessToken = generateAccessToken(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
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

    // 新規セッション作成
    await this.createSessionForUser(user.id)

    // JWTトークン生成
    const accessToken = generateAccessToken(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
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

  /**
   * 現在のユーザー情報を取得
   */
  async getCurrentUser(userId: string): Promise<{
    id: string
    email: string
    username: string
    role: string
  }> {
    const user = await this.repository.findUserById(userId)
    if (!user || !user.email || !user.username) {
      throw new AppError('USER_NOT_FOUND')
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    }
  }
}
