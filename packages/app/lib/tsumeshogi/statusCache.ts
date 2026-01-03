/**
 * 詰将棋ステータスのキャッシュ更新管理
 *
 * 詰将棋を解いた後に一覧画面のキャッシュを更新するための仕組み。
 * API再取得なしでUIを最新状態に保つ。
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import type { TsumeshogiStatus } from '@/lib/api/tsumeshogi'

const STORAGE_KEY = 'tsumeshogi_status_updates'

export interface StatusUpdate {
  id: string
  status: TsumeshogiStatus
}

/**
 * ステータス更新を保存
 *
 * 詰将棋を解いた後に呼び出す。
 * solvedからin_progressへの降格は行わない。
 */
export async function saveStatusUpdate(update: StatusUpdate): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY)
    let updates: StatusUpdate[] = []

    if (existing) {
      try {
        updates = JSON.parse(existing)
      } catch (parseError) {
        console.warn('[statusCache] Corrupted cache, resetting:', parseError)
        // 破損したデータは無視して新規開始
      }
    }

    // 同じIDがあれば更新、なければ追加
    const index = updates.findIndex((u) => u.id === update.id)
    if (index >= 0) {
      // solvedからin_progressへの降格は行わない
      if (updates[index]?.status === 'solved' && update.status === 'in_progress') {
        return
      }
      updates[index] = update
    } else {
      updates.push(update)
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updates))
  } catch (error) {
    console.error('[statusCache] Failed to save status update:', error)
  }
}

/**
 * 保留中のステータス更新を取得してクリア
 *
 * 一覧画面がフォーカスされた時に呼び出す。
 */
export async function consumeStatusUpdates(): Promise<StatusUpdate[]> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY)
    if (!existing) return []

    let updates: StatusUpdate[]
    try {
      updates = JSON.parse(existing)
    } catch (parseError) {
      console.warn('[statusCache] Corrupted cache, clearing:', parseError)
      await AsyncStorage.removeItem(STORAGE_KEY)
      return []
    }

    // クリア
    await AsyncStorage.removeItem(STORAGE_KEY)
    return updates
  } catch (error) {
    console.error('[statusCache] Failed to consume status updates:', error)
    return []
  }
}
