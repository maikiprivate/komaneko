/**
 * 強制アップデート状態管理
 *
 * APIレスポンスから最小バージョンを取得し、
 * アップデートが必要かどうかを管理する。
 */

import { isAppVersionValid } from './versionUtils'

/** 更新が必要かどうかの状態 */
let updateRequired = false

/** 更新状態が変わった時のリスナー */
type UpdateListener = (required: boolean) => void
const listeners: Set<UpdateListener> = new Set()

/**
 * APIレスポンスヘッダーから最小バージョンをチェック
 * @param headers fetchのレスポンスヘッダー
 */
export function checkMinVersionFromHeaders(headers: Headers): void {
  const minVersion = headers.get('X-Min-App-Version')
  if (!minVersion) return

  const needsUpdate = !isAppVersionValid(minVersion)
  if (needsUpdate !== updateRequired) {
    updateRequired = needsUpdate
    notifyListeners()
  }
}

/**
 * 更新が必要かどうかを取得
 */
export function isUpdateRequired(): boolean {
  return updateRequired
}

/**
 * 更新状態のリスナーを登録
 */
export function subscribeToUpdateStatus(listener: UpdateListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * リスナーに通知
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener(updateRequired))
}
