/**
 * 認証画面グループのレイアウト
 * - index: ウェルカム画面（初回起動時）
 * - signup: 新規登録画面
 * - login: ログイン画面
 */

import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
    </Stack>
  )
}
