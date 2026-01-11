/**
 * バージョン比較ユーティリティ
 */

import { compareVersions, isValidVersion } from '@komaneko/shared'
import Constants from 'expo-constants'

// 共有パッケージから再エクスポート
export { compareVersions, isValidVersion }

/**
 * アプリの現在のバージョンを取得
 */
export function getAppVersion(): string {
  return Constants.expoConfig?.version || '0.0.0'
}

/**
 * アプリが最小バージョン以上かチェック
 * @param minVersion 最小必須バージョン
 * @returns true: 更新不要, false: 更新必要
 */
export function isAppVersionValid(minVersion: string): boolean {
  // バリデーション: 不正な形式の場合は更新不要として扱う（安全側に倒す）
  if (!isValidVersion(minVersion)) {
    console.warn(`Invalid minVersion format received: ${minVersion}`)
    return true
  }

  const currentVersion = getAppVersion()
  if (!isValidVersion(currentVersion)) {
    console.warn(`Invalid app version: ${currentVersion}`)
    return true
  }

  return compareVersions(currentVersion, minVersion) >= 0
}
