/**
 * テーマへのアクセスを提供するhook
 *
 * 使用例:
 * const { colors, colorScheme, isDark } = useTheme()
 * <View style={{ backgroundColor: colors.background.primary }} />
 */

import { useColorScheme } from 'react-native'
import Colors, { type ThemeColors, type ColorScheme } from '@/constants/Colors'

interface UseThemeReturn {
  colors: ThemeColors
  colorScheme: ColorScheme
  isDark: boolean
  palette: typeof Colors.palette
}

export function useTheme(): UseThemeReturn {
  const systemColorScheme = useColorScheme()
  const colorScheme: ColorScheme = systemColorScheme === 'dark' ? 'dark' : 'light'
  const isDark = colorScheme === 'dark'

  return {
    colors: Colors[colorScheme],
    colorScheme,
    isDark,
    palette: Colors.palette,
  }
}
