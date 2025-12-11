/**
 * パスワードのハッシュ化・検証ユーティリティ
 */

import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

/**
 * パスワードをハッシュ化する
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * パスワードを検証する
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
