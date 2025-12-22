/**
 * 駒猫 管理画面 Tailwind設定
 * カラーは @komaneko/shared/brand/colors からインポート
 */

import { tailwindColors } from '@komaneko/shared/brand/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: tailwindColors,
    },
  },
  plugins: [],
}
