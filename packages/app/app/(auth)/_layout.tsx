/**
 * 認証画面グループのレイアウト
 * - index: ウェルカム画面（初回起動時）
 * - signup: 新規登録画面
 * - login: ログイン画面
 *
 * 認証済みの場合は(tabs)にリダイレクト
 */

import { Redirect, Stack } from 'expo-router'

import { useAuth } from '@/lib/auth/AuthContext'

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  // 認証状態の読み込み中は何も表示しない
  if (isLoading) {
    return null
  }

  // 認証済みの場合はホーム画面へリダイレクト
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
    </Stack>
  )
}
