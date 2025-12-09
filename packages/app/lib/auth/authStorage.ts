/**
 * 認証状態のAsyncStorageユーティリティ
 * モック認証用の実装（本番APIができるまでの暫定）
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
 */
export async function clearAuthState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_KEY)
  } catch (error) {
    console.error('[authStorage] Failed to clear auth state:', error)
  }
}

/**
 * モックログイン
 * TODO: 本番実装時はAPI呼び出しに置き換え
 */
export async function mockLogin(email: string, password: string): Promise<boolean> {
  // password はモック実装では使用しない（本番ではサーバーに送信）
  void password
  return setAuthState({
    isAuthenticated: true,
    userId: `user_${Date.now()}`,
    email,
  })
}

export interface SignupParams {
  username: string
  email: string
  password: string
}

/**
 * モック新規登録
 * TODO: 本番実装時は既存ユーザーチェック、メール確認フロー、パスワードハッシュ化を追加
 */
export async function mockSignup(params: SignupParams): Promise<boolean> {
  // パスワードはモック実装では保存しない（本番ではサーバーに送信）
  return setAuthState({
    isAuthenticated: true,
    userId: `user_${Date.now()}`,
    username: params.username,
    email: params.email,
  })
}

/**
 * ログアウト
 */
export async function logout(): Promise<void> {
  await clearAuthState()
}
