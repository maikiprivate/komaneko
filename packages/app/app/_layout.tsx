import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito'
import { Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { ForceUpdateModal } from '@/components/ForceUpdateModal'
import { useColorScheme } from '@/components/useColorScheme'
import { useTheme } from '@/components/useTheme'
import { getStreak } from '@/lib/api/learning'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'
import { saveStreakData } from '@/lib/streak/streakStorage'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  })

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error
  }, [error])

  if (!loaded) {
    return null
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const { palette } = useTheme()
  const { isLoading, isAuthenticated } = useAuth()

  // 認証状態の読み込みが完了したらスプラッシュを非表示
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  // アプリ起動時にサーバーと同期（認証時1回のみ）
  useEffect(() => {
    const syncStreak = async () => {
      try {
        const apiData = await getStreak()
        await saveStreakData({
          currentCount: apiData.currentCount,
          longestCount: apiData.longestCount,
          lastActiveDate: apiData.lastActiveDate,
          completedDates: apiData.completedDates,
        })
      } catch {
        // オフライン時は何もしない（キャッシュを使用）
      }
    }
    if (isAuthenticated) {
      syncStreak()
    }
  }, [isAuthenticated])

  // 認証状態の読み込み中は何も表示しない（スプラッシュを維持）
  if (isLoading) {
    return null
  }

  // 常に同じStack構造をレンダリング
  // 認証ガードは各グループのネストレイアウトで行う
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        <Stack.Screen
          name="tsumeshogi/[id]"
          options={{
            headerShown: true,
            title: '詰将棋',
            headerStyle: { backgroundColor: palette.orange },
            headerTintColor: '#FFFFFF',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="lesson/[courseId]/index"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: palette.orange },
            headerTintColor: '#FFFFFF',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="lesson/[courseId]/[lessonId]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <ForceUpdateModal />
    </ThemeProvider>
  )
}
