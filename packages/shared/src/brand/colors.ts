/**
 * 駒猫 共通カラーパレット
 *
 * アプリ・管理画面・将来のWebアプリで共通使用
 * 変更時はここだけ修正すれば全プロジェクトに反映
 */

export const palette = {
  // ========== ブランドカラー ==========
  orange: '#FF8C42',
  orangeLight: '#FFB074',
  orangeDark: '#E67A35',
  maroon: '#8B3A3A',
  maroonLight: '#C75050',

  // ========== ニュートラル ==========
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8F9FA',
  gray100: '#F0F0F0',
  gray200: '#E0E0E0',
  gray300: '#D0D0D0',
  gray400: '#B0B0B0',
  gray500: '#888888',
  gray600: '#666666',
  gray700: '#444444',
  gray800: '#2D3436',
  gray900: '#1A1A1A',

  // ========== ダークモード用 ==========
  dark100: '#1E1E1E',
  dark200: '#121212',

  // ========== セマンティック ==========
  success: '#4CAF50',
  successLight: '#C8E6C9',
  error: '#FF5252',
  errorLight: '#FFCDD2',
  warning: '#FF9800',
  warningLight: '#FFE0B2',
  info: '#2196F3',
  infoLight: '#BBDEFB',

  // ========== ゲーミフィケーション ==========
  heart: '#FF5252',
  streak: '#FF9800',

  // ========== 将棋盤 ==========
  shogiBoard: '#DCB35C',
  shogiSelected: '#FFE0B2',
  gameBackground: '#FFF3E0',
} as const

/**
 * Tailwind用カラー設定
 * tailwind.config.js で使用
 */
export const tailwindColors = {
  primary: {
    DEFAULT: palette.orange,
    light: palette.orangeLight,
    dark: palette.orangeDark,
  },
  accent: {
    DEFAULT: palette.maroon,
    light: palette.maroonLight,
  },
  success: {
    DEFAULT: palette.success,
    light: palette.successLight,
  },
  error: {
    DEFAULT: palette.error,
    light: palette.errorLight,
  },
  warning: {
    DEFAULT: palette.warning,
    light: palette.warningLight,
  },
  game: {
    background: palette.gameBackground,
  },
}

export type Palette = typeof palette
