/**
 * 認証API
 */
import { apiRequest, setToken, clearToken, ApiClientError } from './client'

export interface User {
  id: string
  email: string
  username: string
  role: string
}

interface LoginResponse {
  user: User
  accessToken: string
}

/**
 * ログイン
 */
export async function login(email: string, password: string): Promise<User> {
  const response = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  // 管理者権限チェック
  if (response.user.role !== 'admin') {
    clearToken()
    throw new Error('管理者権限がありません')
  }

  setToken(response.accessToken)
  return response.user
}

/**
 * ログアウト
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' })
  } finally {
    clearToken()
  }
}

/**
 * 現在のユーザーを取得
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest<{ user: User }>('/api/auth/me')
    return response.user
  } catch (error) {
    // 認証エラー（401/403）の場合のみトークンをクリア
    if (error instanceof ApiClientError && (error.statusCode === 401 || error.statusCode === 403)) {
      clearToken()
    }
    return null
  }
}
