/**
 * ハート消費フック
 *
 * コンテンツ完了時にハートを消費する共通ロジック。
 * 消費失敗時はアラートを表示し、完了扱いにしない（不正防止）。
 *
 * @deprecated
 * TODO: レッスン機能が POST /api/lesson/record に移行したら、このファイルを削除する。
 * 現在はuseHeartsGate経由でレッスン画面でのみ使用。
 * 詰将棋は POST /api/tsumeshogi/record に移行済み。
 */

import { useCallback, useRef, useState } from 'react'
import { Alert } from 'react-native'

import { ApiError, getErrorMessage } from '../api/client'
import { consumeHearts, type ConsumeHeartsResponse } from '../api/hearts'

/** フックの戻り値 */
export interface UseHeartsConsumeResult {
  /** ハートを消費する。成功時true、失敗時false */
  consume: (amount?: number) => Promise<boolean>
  /** 消費処理中かどうか */
  isConsuming: boolean
}

/**
 * ハート消費フック
 *
 * @param onConsumed 消費成功時に呼ばれるコールバック（レスポンスを受け取る）
 */
export function useHeartsConsume(
  onConsumed?: (response: ConsumeHeartsResponse) => void
): UseHeartsConsumeResult {
  const [isConsuming, setIsConsuming] = useState(false)

  // refで保持して依存配列から除外（不要な再生成を防止）
  const isConsumingRef = useRef(false)
  const onConsumedRef = useRef(onConsumed)
  onConsumedRef.current = onConsumed

  const consume = useCallback(async (amount: number = 1): Promise<boolean> => {
    if (isConsumingRef.current) return false
    isConsumingRef.current = true
    setIsConsuming(true)

    try {
      const response = await consumeHearts(amount)
      onConsumedRef.current?.(response)
      return true
    } catch (err) {
      // 消費失敗時はアラート表示、完了にしない
      console.error('[useHeartsConsume] 消費失敗:', err)

      // エラーの種類に応じてメッセージを分岐
      if (err instanceof ApiError) {
        if (err.code === 'NO_HEARTS_LEFT') {
          Alert.alert(
            'ハートが足りません',
            'ハートが回復するまでお待ちください。1時間で1ハート回復します。'
          )
        } else if (err.code === 'NETWORK_ERROR') {
          Alert.alert(
            '通信エラー',
            'ネットワークに接続できません。電波状況を確認してください。'
          )
        } else {
          Alert.alert('エラー', getErrorMessage(err.code))
        }
      } else {
        Alert.alert(
          '通信エラー',
          '通信に失敗しました。電波状況を確認してもう一度お試しください。'
        )
      }
      return false
    } finally {
      isConsumingRef.current = false
      setIsConsuming(false)
    }
  }, [])

  return { consume, isConsuming }
}
