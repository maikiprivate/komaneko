/**
 * 認証状態のContext
 * - アプリ全体で認証状態を共有
 * - ログイン/ログアウト時に状態を更新
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { ApiError } from '../api/client'
import {
  deleteAccountApi,
  getMeApi,
  loginApi,
  logoutApi,
  registerApi,
} from '../api/auth'
import { clearToken, getToken, saveToken } from './tokenStorage'
import {
  setAuthState,
  clearAuthState,
  type AuthState,
  type SignupParams,
} from './authStorage'

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
  /** ログイン（エラー時はApiErrorをthrow） */
  login: (email: string, password: string) => Promise<void>
  /** 新規登録（エラー時はApiErrorをthrow） */
  signup: (params: SignupParams) => Promise<void>
  /** ログアウト */
  logout: () => Promise<void>
  /** 退会（アカウント削除） */
  deleteAccount: () => Promise<void>
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
        // まずトークンの存在確認
        const token = await getToken()
        if (!token) {
          // トークンがなければ未認証
          setAuthStateLocal({ isAuthenticated: false })
          return
        }

        // トークンがあればAPIでユーザー情報を取得
        const user = await getMeApi()
        const newState: AuthState = {
          isAuthenticated: true,
          userId: user.id,
          username: user.username,
          email: user.email,
        }
        setAuthStateLocal(newState)
        await setAuthState(newState)
      } catch (error) {
        console.error('[AuthContext] Failed to load auth state:', error)
        // トークンが無効な場合はクリアして未認証状態に
        await clearToken()
        await clearAuthState()
        setAuthStateLocal({ isAuthenticated: false })
      } finally {
        setIsLoading(false)
      }
    }
    loadAuthState()
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const result = await loginApi(email, password)

    // トークンを保存
    await saveToken(result.accessToken)

    // 認証状態を更新
    const newState: AuthState = {
      isAuthenticated: true,
      userId: result.user.id,
      username: result.user.username,
      email: result.user.email,
    }
    await setAuthState(newState)
    setAuthStateLocal(newState)
  }

  const signup = async (params: SignupParams): Promise<void> => {
    const result = await registerApi(params.email, params.password, params.username)

    // トークンを保存
    await saveToken(result.accessToken)

    // 認証状態を更新
    const newState: AuthState = {
      isAuthenticated: true,
      userId: result.user.id,
      username: result.user.username,
      email: result.user.email,
    }
    await setAuthState(newState)
    setAuthStateLocal(newState)
  }

  const logout = async (): Promise<void> => {
    try {
      await logoutApi()
    } catch (error) {
      // ログアウトAPIが失敗してもローカル状態はクリアする
      console.error('[AuthContext] Logout API failed:', error)
    }

    // トークンと認証状態をクリア
    await clearToken()
    await clearAuthState()
    setAuthStateLocal({ isAuthenticated: false })
  }

  const deleteAccount = async (): Promise<void> => {
    await deleteAccountApi()

    // トークンと認証状態をクリア
    await clearToken()
    await clearAuthState()
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
    deleteAccount,
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

// エラーハンドリング用にApiErrorを再エクスポート
export { ApiError }
