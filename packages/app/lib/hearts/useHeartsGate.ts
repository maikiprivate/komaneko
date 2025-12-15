/**
 * ハートゲートフック
 *
 * コンテンツ開始時のハートチェックと完了時のハート消費を一括管理する。
 * 詰将棋・レッスンなど、ハート消費が必要なコンテンツで共通利用。
 *
 * 使用例:
 * ```
 * const heartsGate = useHeartsGate({ heartCost: 1 })
 *
 * // 開始時チェック済みか
 * if (!heartsGate.isReady) return <Loading />
 *
 * // 完了時に消費
 * const success = await heartsGate.consumeOnComplete()
 * if (success) { setCompleted(true) }
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { router } from 'expo-router'

import { checkHeartsAvailable } from './checkHeartsAvailable'
import { useHearts } from './useHearts'
import { useHeartsConsume } from './useHeartsConsume'

/** フックのオプション */
interface UseHeartsGateOptions {
  /** 消費するハート数（デフォルト: 1） */
  heartCost?: number
  /** ハート不足時に自動で戻るか（デフォルト: true） */
  autoGoBack?: boolean
}

/** フックの戻り値 */
export interface UseHeartsGateResult {
  /** ハートチェックが完了し、利用可能な状態か */
  isReady: boolean
  /** ハートがロード中か */
  isLoading: boolean
  /** エラーが発生したか */
  error: string | null
  /** 現在のハート情報 */
  hearts: ReturnType<typeof useHearts>['hearts']
  /** コンテンツ完了時にハートを消費する。成功時true */
  consumeOnComplete: () => Promise<boolean>
  /** ハート消費中か */
  isConsuming: boolean
  /** 指定量のハートがあるかチェック（アラート表示付き） */
  checkAvailable: () => boolean
}

/**
 * ハートゲートフック
 *
 * @param options オプション
 */
export function useHeartsGate(options: UseHeartsGateOptions = {}): UseHeartsGateResult {
  const { heartCost = 1, autoGoBack = true } = options

  const { hearts, isLoading, error, updateFromConsumeResponse } = useHearts()
  const { consume, isConsuming } = useHeartsConsume(updateFromConsumeResponse)

  // 開始時チェック済みフラグ（重複実行防止）
  const hasCheckedRef = useRef(false)
  // isReadyをuseStateで管理（再レンダリングをトリガー）
  const [isReady, setIsReady] = useState(false)

  // 開始時ハートチェック
  useEffect(() => {
    if (!isLoading && !hasCheckedRef.current) {
      hasCheckedRef.current = true

      // エラー時はチェックしない（エラー画面を表示するため）
      if (error) {
        return
      }

      const available = checkHeartsAvailable(hearts, heartCost)
      setIsReady(available)

      if (!available && autoGoBack) {
        router.back()
      }
    }
  }, [isLoading, error, hearts, heartCost, autoGoBack])

  // ハート利用可能かチェック（アラート表示付き）
  const checkAvailable = useCallback(() => {
    return checkHeartsAvailable(hearts, heartCost)
  }, [hearts, heartCost])

  // 完了時にハート消費
  const consumeOnComplete = useCallback(async (): Promise<boolean> => {
    return consume(heartCost)
  }, [consume, heartCost])

  return {
    isReady,
    isLoading,
    error,
    hearts,
    consumeOnComplete,
    isConsuming,
    checkAvailable,
  }
}
