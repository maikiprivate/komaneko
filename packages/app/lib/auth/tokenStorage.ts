/**
 * JWTトークン管理
 *
 * expo-secure-storeが使える環境（Development Build）では暗号化保存、
 * 使えない環境（Expo Go）ではAsyncStorageにフォールバック。
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'komaneko_access_token'
const ASYNC_STORAGE_TOKEN_KEY = '@komaneko/access_token'

/** SecureStoreが使用可能かどうか */
let secureStoreAvailable: boolean | null = null

async function isSecureStoreAvailable(): Promise<boolean> {
  if (secureStoreAvailable !== null) {
    return secureStoreAvailable
  }
  secureStoreAvailable = await SecureStore.isAvailableAsync()
  return secureStoreAvailable
}

/**
 * JWTトークンを保存する
 */
export async function saveToken(token: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
  } else {
    await AsyncStorage.setItem(ASYNC_STORAGE_TOKEN_KEY, token)
  }
}

/**
 * JWTトークンを取得する
 */
export async function getToken(): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  }
  return await AsyncStorage.getItem(ASYNC_STORAGE_TOKEN_KEY)
}

/**
 * JWTトークンを削除する
 */
export async function clearToken(): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } else {
    await AsyncStorage.removeItem(ASYNC_STORAGE_TOKEN_KEY)
  }
}
