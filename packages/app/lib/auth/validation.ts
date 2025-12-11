/**
 * 認証関連のバリデーション
 *
 * バリデーションルールは @komaneko/shared から参照し、
 * フロントエンドとバックエンドで統一する。
 */

import {
  EMAIL_PATTERN,
  PASSWORD_LOWERCASE_PATTERN,
  PASSWORD_MIN_LENGTH,
  PASSWORD_NUMBER_PATTERN,
  PASSWORD_UPPERCASE_PATTERN,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  USERNAME_PATTERN_ERROR,
} from '@komaneko/shared'

/** メールアドレスの形式をチェック（簡易的、RFC準拠ではない） */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}

/** ユーザー名の最小文字数（後方互換性のためエクスポート） */
export const MIN_USERNAME_LENGTH = USERNAME_MIN_LENGTH

/** ユーザー名の最大文字数（後方互換性のためエクスポート） */
export const MAX_USERNAME_LENGTH = USERNAME_MAX_LENGTH

/** パスワードの最小文字数（後方互換性のためエクスポート） */
export const MIN_PASSWORD_LENGTH = PASSWORD_MIN_LENGTH

/**
 * ユーザー名のバリデーション
 * - 2文字以上20文字以下
 * - 使用可能: 英数字、アンダースコア、ひらがな、カタカナ、漢字
 * @returns エラーメッセージ（問題なければnull）
 */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim()
  if (!trimmed) {
    return 'ユーザー名を入力してください'
  }
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return `ユーザー名は${USERNAME_MIN_LENGTH}文字以上で入力してください`
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return `ユーザー名は${USERNAME_MAX_LENGTH}文字以下で入力してください`
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return USERNAME_PATTERN_ERROR
  }
  return null
}

/**
 * メールアドレスのバリデーション
 * @returns エラーメッセージ（問題なければnull）
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return 'メールアドレスを入力してください'
  }
  if (!isValidEmail(email.trim())) {
    return '有効なメールアドレスを入力してください'
  }
  return null
}

/**
 * パスワードのバリデーション
 * - 8文字以上
 * - 英字大文字を1文字以上含む
 * - 英字小文字を1文字以上含む
 * - 半角数字を1文字以上含む
 * - スペース不可
 * @returns エラーメッセージ（問題なければnull）
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'パスワードを入力してください'
  }
  if (password.includes(' ')) {
    return 'パスワードにスペースは使用できません'
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`
  }
  if (!PASSWORD_UPPERCASE_PATTERN.test(password)) {
    return 'パスワードに英字大文字を含めてください'
  }
  if (!PASSWORD_LOWERCASE_PATTERN.test(password)) {
    return 'パスワードに英字小文字を含めてください'
  }
  if (!PASSWORD_NUMBER_PATTERN.test(password)) {
    return 'パスワードに数字を含めてください'
  }
  return null
}
