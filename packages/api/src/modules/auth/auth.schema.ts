/**
 * 認証API用Zodスキーマ
 */

import { z } from 'zod'

/**
 * 新規登録リクエスト
 */
export const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/[a-z]/, '小文字を含めてください')
    .regex(/[A-Z]/, '大文字を含めてください')
    .regex(/[0-9]/, '数字を含めてください'),
  username: z
    .string()
    .min(2, 'ユーザー名は2文字以上で入力してください')
    .max(20, 'ユーザー名は20文字以内で入力してください')
    .regex(
      /^[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/,
      '使用できない文字が含まれています'
    ),
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
