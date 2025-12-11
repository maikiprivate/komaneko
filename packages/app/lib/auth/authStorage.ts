/**
 * 認証状態のAsyncStorageユーティリティ
 *
 * ユーザー情報のローカルキャッシュとして使用。
 * 認証の正当性はJWTトークン（tokenStorage.ts）で判定する。
 * このストレージはアプリ再起動時のUI表示高速化が主目的。
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const AUTH_KEY = '@komaneko/auth'

export interface AuthState {
  /** 認証済みかどうか */
  isAuthenticated: boolean
  /** ユーザーID */
  userId?: string
  /** ユーザー名 */
  username?: string
  /** メールアドレス */
  email?: string
}

const DEFAULT_STATE: AuthState = {
  isAuthenticated: false,
}

/**
 * 認証状態を取得
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    const data = await AsyncStorage.getItem(AUTH_KEY)
    if (!data) return DEFAULT_STATE

    const parsed = JSON.parse(data) as Partial<AuthState>
    return {
      isAuthenticated: parsed.isAuthenticated ?? false,
      userId: parsed.userId,
      username: parsed.username,
      email: parsed.email,
    }
  } catch (error) {
    console.error('[authStorage] Failed to get auth state:', error)
    return DEFAULT_STATE
  }
}

/**
 * 認証状態を保存
 */
export async function setAuthState(state: AuthState): Promise<boolean> {
  try {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(state))
    return true
  } catch (error) {
    console.error('[authStorage] Failed to save auth state:', error)
    return false
  }
}

/**
 * 認証状態をクリア（ログアウト用）
 * @returns 成功時は true、失敗時は false
 */
export async function clearAuthState(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(AUTH_KEY)
    return true
  } catch (error) {
    console.error('[authStorage] Failed to clear auth state:', error)
    return false
  }
}

export interface SignupParams {
  username: string
  email: string
  password: string
}
