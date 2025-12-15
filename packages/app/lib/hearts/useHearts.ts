/**
 * ハート状態管理フック
 *
 * - 画面フォーカス時にAPIからデータ取得
 * - クライアント側で回復計算
 * - 1分ごとに残り時間をカウントダウン
 * - 回復タイミングでハート数を更新（満タン時は停止）
 */

import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getHearts, type HeartsResponse } from '../api/hearts'
import { calculateHearts, type HeartsCalculation } from './heartsUtils'

/** フックの戻り値 */
export interface UseHeartsResult {
  hearts: HeartsCalculation | null
  isLoading: boolean
  error: string | null
  /** 手動でデータを再取得する（ハート消費後に呼ぶ） */
  refetch: () => Promise<void>
}

/**
 * ハート状態を管理するカスタムフック
 *
 * @returns ハート状態と操作関数
 */
export function useHearts(): UseHeartsResult {
  const [hearts, setHearts] = useState<HeartsCalculation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // APIレスポンスをキャッシュ（再計算用）
  const cachedDataRef = useRef<HeartsResponse | null>(null)

  // 画面がフォーカスされているかどうか
  const isFocusedRef = useRef(false)

  // 1分更新タイマーID
  const minuteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 1分タイマーをクリア */
  const clearMinuteTimer = useCallback(() => {
    if (minuteTimerRef.current) {
      clearInterval(minuteTimerRef.current)
      minuteTimerRef.current = null
    }
  }, [])

  /** キャッシュから再計算（満タンならタイマー停止） */
  const recalculateAndUpdate = useCallback(() => {
    if (!cachedDataRef.current || !isFocusedRef.current) {
      return
    }

    const newCalculated = calculateHearts(cachedDataRef.current)
    setHearts(newCalculated)

    // 満タンになったらタイマー停止
    if (newCalculated.isFull) {
      clearMinuteTimer()
    }
  }, [clearMinuteTimer])

  /** 1分ごとの更新タイマーを開始 */
  const startMinuteTimer = useCallback(() => {
    clearMinuteTimer()

    // 1分ごとに再計算
    minuteTimerRef.current = setInterval(() => {
      recalculateAndUpdate()
    }, 60 * 1000)
  }, [clearMinuteTimer, recalculateAndUpdate])

  /** APIからデータを取得し、回復計算を行う */
  const fetchHearts = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getHearts()
      cachedDataRef.current = data
      const calculated = calculateHearts(data)
      setHearts(calculated)
      setError(null)

      // 満タンでなければ1分タイマー開始
      if (!calculated.isFull && isFocusedRef.current) {
        startMinuteTimer()
      }
    } catch (err) {
      console.log('[useHearts] エラー:', err)
      cachedDataRef.current = null
      setHearts(null)
      setError('ハート情報を取得できませんでした')
      clearMinuteTimer()
    } finally {
      setIsLoading(false)
    }
  }, [startMinuteTimer, clearMinuteTimer])

  // 画面フォーカス時の処理
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true
      fetchHearts()

      return () => {
        isFocusedRef.current = false
        clearMinuteTimer()
      }
    }, [fetchHearts, clearMinuteTimer])
  )

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearMinuteTimer()
    }
  }, [clearMinuteTimer])

  return {
    hearts,
    isLoading,
    error,
    refetch: fetchHearts,
  }
}
