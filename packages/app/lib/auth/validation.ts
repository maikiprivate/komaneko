/**
 * 認証関連のバリデーション
 */

/** メールアドレスの形式をチェック（簡易的、RFC準拠ではない） */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/** パスワードの最小文字数 */
export const MIN_PASSWORD_LENGTH = 8

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
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください`
  }
  if (!/[A-Z]/.test(password)) {
    return 'パスワードに英字大文字を含めてください'
  }
  if (!/[a-z]/.test(password)) {
    return 'パスワードに英字小文字を含めてください'
  }
  if (!/[0-9]/.test(password)) {
    return 'パスワードに数字を含めてください'
  }
  return null
}
