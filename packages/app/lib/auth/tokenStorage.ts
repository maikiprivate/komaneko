/**
 * JWTトークン管理
 *
 * expo-secure-storeを使用して、JWTトークンを暗号化して保存する。
 */

import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'komaneko_access_token'

/**
 * JWTトークンを保存する
 */
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

/**
 * JWTトークンを取得する
 */
export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY)
}

/**
 * JWTトークンを削除する
 */
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}
