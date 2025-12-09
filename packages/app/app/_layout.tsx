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

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
  // TODO: 認証フロー実装後、認証状態に応じて分岐する
  initialRouteName: '(auth)',  // テスト用に一時的に変更
}

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

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return <RootLayoutNav />
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const { palette } = useTheme()

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="tsumeshogi/[id]"
          options={{
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
