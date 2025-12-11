/**
 * 認証API用Zodスキーマ
 */

import {
  PASSWORD_LOWERCASE_PATTERN,
  PASSWORD_MIN_LENGTH,
  PASSWORD_NUMBER_PATTERN,
  PASSWORD_UPPERCASE_PATTERN,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  USERNAME_PATTERN_ERROR,
} from '@komaneko/shared'
import { z } from 'zod'

/**
 * 新規登録リクエスト
 */
export const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`)
    .regex(PASSWORD_LOWERCASE_PATTERN, '小文字を含めてください')
    .regex(PASSWORD_UPPERCASE_PATTERN, '大文字を含めてください')
    .regex(PASSWORD_NUMBER_PATTERN, '数字を含めてください'),
  username: z
    .string()
    .min(USERNAME_MIN_LENGTH, `ユーザー名は${USERNAME_MIN_LENGTH}文字以上で入力してください`)
    .max(USERNAME_MAX_LENGTH, `ユーザー名は${USERNAME_MAX_LENGTH}文字以内で入力してください`)
    .regex(USERNAME_PATTERN, USERNAME_PATTERN_ERROR),
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * ログインリクエスト
 *
 * パスワードのバリデーションは意図的に緩くしている。
 * 登録時のポリシー（8文字以上、大文字小文字数字必須）と一致させない理由：
 * - ログイン試行時に「パスワードが短すぎます」等のエラーを返すと、
 *   攻撃者にパスワードポリシーの情報を与えてしまう
 * - 存在しないメールでも同じ「認証失敗」エラーを返すことでセキュリティを向上
 */
export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

export type LoginInput = z.infer<typeof loginSchema>
