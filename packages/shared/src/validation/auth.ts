/**
 * 認証関連のバリデーションルール
 *
 * フロントエンド・バックエンド両方で使用する定数を定義。
 * バリデーションロジック自体は各パッケージで実装する。
 */

// ========== ユーザー名 ==========

/** ユーザー名の最小文字数 */
export const USERNAME_MIN_LENGTH = 2

/** ユーザー名の最大文字数 */
export const USERNAME_MAX_LENGTH = 20

/**
 * ユーザー名に使用可能な文字のパターン
 * - 英数字（a-z, A-Z, 0-9）
 * - アンダースコア（_）
 * - ひらがな（\u3040-\u309F）
 * - カタカナ（\u30A0-\u30FF）
 * - 漢字（\u4E00-\u9FAF）
 */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/

/** ユーザー名の文字種エラーメッセージ */
export const USERNAME_PATTERN_ERROR = '使用できない文字が含まれています'

// ========== パスワード ==========

/** パスワードの最小文字数 */
export const PASSWORD_MIN_LENGTH = 8

/** パスワードに小文字を含む必要があるパターン */
export const PASSWORD_LOWERCASE_PATTERN = /[a-z]/

/** パスワードに大文字を含む必要があるパターン */
export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/

/** パスワードに数字を含む必要があるパターン */
export const PASSWORD_NUMBER_PATTERN = /[0-9]/

// ========== メールアドレス ==========

/** メールアドレスの簡易バリデーションパターン（RFC準拠ではない） */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
