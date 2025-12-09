/**
 * 認証状態のContext
 * - アプリ全体で認証状態を共有
 * - ログイン/ログアウト時に状態を更新
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import {
  getAuthState,
  setAuthState,
  clearAuthState,
  type AuthState,
  type SignupParams,
} from './authStorage'

/**
 * モック用のユーザーID生成
 * Date.now()のみだと同一ミリ秒で重複の可能性があるため、ランダム文字列を付加
 */
function generateMockUserId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  return `user_${timestamp}_${randomPart}`
}

export interface AuthContextType {
  /** 認証済みかどうか */
  isAuthenticated: boolean
  /** 認証状態の読み込み中かどうか */
  isLoading: boolean
  /** ユーザー情報 */
  user: {
    userId?: string
    username?: string
    email?: string
  } | null
  /** ログイン */
  login: (email: string, password: string) => Promise<boolean>
  /** 新規登録 */
  signup: (params: SignupParams) => Promise<boolean>
  /** ログアウト */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [authState, setAuthStateLocal] = useState<AuthState>({
    isAuthenticated: false,
  })

  // 初回マウント時に認証状態を読み込み
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const state = await getAuthState()
        setAuthStateLocal(state)
      } catch (error) {
        console.error('[AuthContext] Failed to load auth state:', error)
        // エラー時はデフォルト状態（未認証）のまま継続
      } finally {
        setIsLoading(false)
      }
    }
    loadAuthState()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // パスワードはモック実装では使用しない（本番ではサーバーに送信）
    void password

    const newState: AuthState = {
      isAuthenticated: true,
      userId: generateMockUserId(),
      email,
    }

    const success = await setAuthState(newState)
    if (success) {
      setAuthStateLocal(newState)
    }
    return success
  }

  const signup = async (params: SignupParams): Promise<boolean> => {
    // パスワードはモック実装では保存しない（本番ではサーバーに送信）
    const newState: AuthState = {
      isAuthenticated: true,
      userId: generateMockUserId(),
      username: params.username,
      email: params.email,
    }

    const success = await setAuthState(newState)
    if (success) {
      setAuthStateLocal(newState)
    }
    return success
  }

  const logout = async (): Promise<void> => {
    const success = await clearAuthState()
    if (!success) {
      console.error('[AuthContext] Logout failed, but clearing local state anyway')
    }
    // ローカル状態は常にクリア（UXを優先し、ストレージエラーがあっても画面はログアウト状態に）
    setAuthStateLocal({ isAuthenticated: false })
  }

  const value: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    user: authState.isAuthenticated
      ? {
          userId: authState.userId,
          username: authState.username,
          email: authState.email,
        }
      : null,
    login,
    signup,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
