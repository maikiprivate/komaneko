import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito'
import { Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { useColorScheme } from '@/components/useColorScheme'
import { useTheme } from '@/components/useTheme'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'

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
  const { isLoading } = useAuth()

  // 認証状態の読み込みが完了したらスプラッシュを非表示
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

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
    </ThemeProvider>
  )
}
