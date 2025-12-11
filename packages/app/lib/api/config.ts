/**
 * API設定
 *
 * APIベースURLの設定。環境変数で上書き可能。
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
