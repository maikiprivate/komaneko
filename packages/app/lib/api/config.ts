/**
 * API設定
 *
 * APIベースURLの設定。
 *
 * 環境の切り替え方法:
 * - 本番: デフォルト（何も設定しない）
 * - 開発: .env.local に EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 を設定
 *
 * 開発時の起動例:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.7:3000 pnpm start
 */

const PRODUCTION_API_URL = 'https://komaneko-production.up.railway.app'

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL

export const isDevelopment = API_BASE_URL !== PRODUCTION_API_URL
