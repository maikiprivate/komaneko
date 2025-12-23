/**
 * React Router設定
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { LessonList } from './pages/lesson/LessonList'
import { useAuth } from './hooks/useAuth'
import type { ReactNode } from 'react'

/**
 * 認証必須ルートのラッパー
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

/**
 * ログイン済みならリダイレクト
 */
function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestRoute>
        <Login />
      </GuestRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'tsumeshogi',
        element: <div className="p-8"><h1 className="text-2xl font-bold">詰将棋管理</h1><p className="text-gray-500 mt-2">Step 5で実装</p></div>,
      },
      {
        path: 'lessons',
        element: <LessonList />,
      },
      {
        path: 'lessons/problems/:lessonId',
        element: <div className="p-8"><h1 className="text-2xl font-bold">問題編集</h1><p className="text-gray-500 mt-2">Step 5で実装中</p></div>,
      },
      {
        path: 'backup',
        element: <div className="p-8"><h1 className="text-2xl font-bold">バックアップ</h1><p className="text-gray-500 mt-2">Step 10で実装</p></div>,
      },
    ],
  },
])
