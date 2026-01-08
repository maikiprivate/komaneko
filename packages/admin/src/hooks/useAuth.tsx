/**
 * 認証状態管理フック
 */
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'
import { type User, login as apiLogin, logout as apiLogout, getCurrentUser } from '../api/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初期化時にユーザー情報を取得
  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        // 管理者のみ許可
        if (u && u.role === 'admin') {
          setUser(u)
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      // エラーが発生しても必ずユーザー状態をクリア
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
