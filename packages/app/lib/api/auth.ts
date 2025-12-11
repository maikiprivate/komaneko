/**
 * 認証API関数
 */

import { apiRequest, apiRequestVoid } from './client'

/** ユーザー情報 */
export interface User {
  id: string
  email: string
  username: string
}

/** 認証成功レスポンス */
interface AuthResult {
  user: User
  accessToken: string
}

/** ログインレスポンス（/meはuserでラップ） */
interface GetMeResult {
  user: User
}

/**
 * 新規登録
 */
export async function registerApi(
  email: string,
  password: string,
  username: string
): Promise<AuthResult> {
  return apiRequest<AuthResult>('/api/auth/register', {
    method: 'POST',
    body: { email, password, username },
    skipAuth: true,
  })
}

/**
 * ログイン
 */
export async function loginApi(
  email: string,
  password: string
): Promise<AuthResult> {
  return apiRequest<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  })
}

/**
 * ログアウト
 */
export async function logoutApi(): Promise<void> {
  await apiRequestVoid('/api/auth/logout', {
    method: 'POST',
  })
}

/**
 * ユーザー情報取得
 */
export async function getMeApi(): Promise<User> {
  const result = await apiRequest<GetMeResult>('/api/auth/me')
  return result.user
}

/**
 * アカウント削除（退会）
 */
export async function deleteAccountApi(): Promise<void> {
  await apiRequestVoid('/api/auth/me', {
    method: 'DELETE',
  })
}
