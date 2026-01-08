/**
 * 駒猫 カラーテーマ
 *
 * すべての色はここで一元管理。コンポーネントで直接色コードを書かない。
 * 使用例: const { colors } = useTheme(); colors.text.primary
 */

// 基本パレット（変更時はここだけ修正）
const palette = {
  // ブランドカラー
  orange: '#FF8C42',
  orangeLight: '#FFB074',
  maroon: '#8B3A3A',
  maroonLight: '#C75050',

  // ニュートラル
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8F9FA',
  gray100: '#F0F0F0',
  gray200: '#E0E0E0',
  gray400: '#B0B0B0',
  gray600: '#666666',
  gray800: '#2D3436',
  gray900: '#1A1A1A',

  // ダークモード用
  dark100: '#1E1E1E',
  dark200: '#121212',

  // ゲーミフィケーション
  red: '#FF5252',
  streakOrange: '#FF9800',
  green: '#4CAF50',
  greenLight: '#C8E6C9',
  correctFeedback: '#8BC34A',
  correctLight: '#E8F5E9', // 正解時のボトムシート背景

  // 将棋盤インタラクション
  shogiSelected: '#FFE0B2',

  // ゲーム画面背景
  gameBackground: '#FFF3E0',
} as const

// ライトモードテーマ
const lightTheme = {
  text: {
    primary: palette.gray800,
    secondary: palette.gray600,
    inverse: palette.white,
  },
  background: {
    primary: palette.white,
    secondary: palette.gray50,
  },
  card: {
    background: palette.white,
    border: palette.gray200,
  },
  button: {
    primary: palette.orange,
    primaryText: palette.white,
    accent: palette.maroon,
    accentText: palette.white,
  },
  border: palette.gray200,
  tabBar: {
    background: palette.white,
    active: palette.orange,
    inactive: palette.gray400,
  },
  gamification: {
    heart: palette.red,
    streak: palette.streakOrange,
    success: palette.green,
    error: palette.red,
  },
} as const

// ダークモードテーマ
const darkTheme = {
  text: {
    primary: palette.white,
    secondary: palette.gray400,
    inverse: palette.gray900,
  },
  background: {
    primary: palette.dark200,
    secondary: palette.dark100,
  },
  card: {
    background: palette.dark100,
    border: palette.gray800,
  },
  button: {
    primary: palette.orangeLight,
    primaryText: palette.gray900,
    accent: palette.maroonLight,
    accentText: palette.white,
  },
  border: palette.gray800,
  tabBar: {
    background: palette.dark100,
    active: palette.orangeLight,
    inactive: palette.gray600,
  },
  gamification: {
    heart: palette.red,
    streak: palette.streakOrange,
    success: palette.green,
    error: palette.red,
  },
} as const

const Colors = {
  palette,
  light: lightTheme,
  dark: darkTheme,
} as const

export default Colors

// 型定義
export type ThemeColors = typeof lightTheme | typeof darkTheme
export type ColorScheme = 'light' | 'dark'
