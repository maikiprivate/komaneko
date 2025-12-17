/**
 * ハート状態管理フック
 *
 * - 初回のみAPIからデータ取得、以降はキャッシュから再計算
 * - クライアント側で回復計算（APIコール削減）
 * - 1分ごとに残り時間をカウントダウン
 * - 回復タイミングでハート数を更新（満タン時は停止）
 * - アプリがバックグラウンドから復帰時に即座に再計算
 * - グローバルキャッシュにより画面間でデータを共有（API呼び出し削減）
 */

import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { getHearts, type HeartsResponse, type ConsumeHeartsResponse } from '../api/hearts'
import { calculateHearts, DEFAULT_MAX_HEARTS, type HeartsCalculation } from './heartsUtils'

/**
 * グローバルキャッシュ（モジュールレベル）
 * 全てのuseHeartsインスタンスで共有され、画面遷移時のAPI再取得を防ぐ
 */
let globalCachedData: HeartsResponse | null = null

/** フックの戻り値 */
export interface UseHeartsResult {
  hearts: HeartsCalculation | null
  isLoading: boolean
  error: string | null
  /** 手動でデータを再取得する */
  refetch: () => Promise<void>
  /** 消費APIレスポンスからキャッシュを更新する（refetchより効率的） */
  updateFromConsumeResponse: (response: ConsumeHeartsResponse) => void
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

  /** 1分タイマーをクリア（依存なしで安定） */
  const clearMinuteTimer = useCallback(() => {
    if (minuteTimerRef.current) {
      clearInterval(minuteTimerRef.current)
      minuteTimerRef.current = null
    }
  }, [])

  /** 1分ごとの更新タイマーを開始 */
  const startMinuteTimer = useCallback(() => {
    // 既存タイマーをクリア
    if (minuteTimerRef.current) {
      clearInterval(minuteTimerRef.current)
    }

    // 1分ごとに再計算（満タンになったら自動停止）
    minuteTimerRef.current = setInterval(() => {
      if (!cachedDataRef.current || !isFocusedRef.current) {
        return
      }

      const newCalculated = calculateHearts(cachedDataRef.current)
      setHearts(newCalculated)

      // 満タンになったらタイマー停止
      if (newCalculated.isFull && minuteTimerRef.current) {
        clearInterval(minuteTimerRef.current)
        minuteTimerRef.current = null
      }
    }, 60 * 1000)
  }, [])

  /** APIからデータを取得し、回復計算を行う */
  const fetchHearts = useCallback(async () => {
    try {
      // グローバルキャッシュがあればAPI呼び出しをスキップ
      if (globalCachedData) {
        cachedDataRef.current = globalCachedData
        const calculated = calculateHearts(globalCachedData)
        setHearts(calculated)
        setError(null)
        setIsLoading(false)

        if (!calculated.isFull && isFocusedRef.current) {
          startMinuteTimer()
        }
        return
      }

      // 初回のみローディング表示（キャッシュがある場合は表示しない）
      if (!cachedDataRef.current) {
        setIsLoading(true)
      }
      const data = await getHearts()
      // グローバルキャッシュとローカルキャッシュ両方に保存
      globalCachedData = data
      cachedDataRef.current = data
      const calculated = calculateHearts(data)
      setHearts(calculated)
      setError(null)

      // 満タンでなければ1分タイマー開始
      if (!calculated.isFull && isFocusedRef.current) {
        startMinuteTimer()
      }
    } catch (err) {
      console.error('[useHearts] エラー:', err)
      globalCachedData = null
      cachedDataRef.current = null
      setHearts(null)
      setError('ハート情報を取得できませんでした')
      clearMinuteTimer()
    } finally {
      setIsLoading(false)
    }
  }, [startMinuteTimer, clearMinuteTimer])

  /** 消費APIレスポンスからキャッシュを更新（APIコールなし） */
  const updateFromConsumeResponse = useCallback(
    (response: ConsumeHeartsResponse) => {
      const maxCount = globalCachedData?.maxCount ?? cachedDataRef.current?.maxCount ?? DEFAULT_MAX_HEARTS
      const newData: HeartsResponse = {
        count: response.remaining,
        maxCount,
        recoveryStartedAt: response.recoveryStartedAt,
      }
      // グローバルキャッシュとローカルキャッシュ両方を更新
      globalCachedData = newData
      cachedDataRef.current = newData
      const calculated = calculateHearts(newData)
      setHearts(calculated)

      // 満タンでなければ1分タイマー開始
      if (!calculated.isFull && isFocusedRef.current) {
        startMinuteTimer()
      } else if (calculated.isFull) {
        clearMinuteTimer()
      }
    },
    [startMinuteTimer, clearMinuteTimer],
  )

  /** キャッシュから再計算（APIコールなし） */
  const recalculateFromCache = useCallback(() => {
    if (!cachedDataRef.current) return

    const newCalculated = calculateHearts(cachedDataRef.current)
    setHearts(newCalculated)
    setIsLoading(false)
    setError(null)

    // 満タンでなければタイマー開始、満タンなら停止
    if (!newCalculated.isFull) {
      startMinuteTimer()
    } else {
      clearMinuteTimer()
    }
  }, [startMinuteTimer, clearMinuteTimer])

  // 画面フォーカス時の処理
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true

      // グローバルキャッシュまたはローカルキャッシュがあれば再計算のみ、なければAPIから取得
      if (globalCachedData || cachedDataRef.current) {
        // グローバルキャッシュがあればローカルにも反映
        if (globalCachedData && !cachedDataRef.current) {
          cachedDataRef.current = globalCachedData
        }
        recalculateFromCache()
      } else {
        fetchHearts()
      }

      return () => {
        isFocusedRef.current = false
        clearMinuteTimer()
      }
    }, [fetchHearts, recalculateFromCache, clearMinuteTimer]),
  )

  // アプリがバックグラウンドから復帰した時に即座に再計算
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      // バックグラウンドからアクティブに復帰した時
      if (nextState === 'active' && isFocusedRef.current && cachedDataRef.current) {
        const newCalculated = calculateHearts(cachedDataRef.current)
        setHearts(newCalculated)

        // 満タンでなければタイマー再開、満タンなら停止
        if (!newCalculated.isFull) {
          startMinuteTimer()
        } else {
          clearMinuteTimer()
        }
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [startMinuteTimer, clearMinuteTimer])

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => clearMinuteTimer()
  }, [clearMinuteTimer])

  return {
    hearts,
    isLoading,
    error,
    refetch: fetchHearts,
    updateFromConsumeResponse,
  }
}
