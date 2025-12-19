/**
 * ハートゲートフック
 *
 * コンテンツ開始時のハートチェックと完了時のハート消費を一括管理する。
 * 詰将棋・レッスンなど、ハート消費が必要なコンテンツで共通利用。
 *
 * @deprecated
 * TODO: レッスン機能が POST /api/lesson/record に移行したら、このファイルを削除する。
 * 現在はレッスン画面（lesson/[courseId]/[lessonId].tsx）でのみ使用。
 * 詰将棋は POST /api/tsumeshogi/record に移行済み（useHearts + 直接API呼び出し）。
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

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { router } from 'expo-router'

import { checkHeartsAvailable, hasEnoughHearts } from './checkHeartsAvailable'
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

  // 初回チェック済みフラグ（アラート表示・自動戻りは一度だけ）
  const hasShownAlertRef = useRef(false)

  // isReadyはheartsから動的に計算（画面フォーカス時も最新状態を反映）
  const isReady = useMemo(() => {
    if (isLoading || error) return false
    return hasEnoughHearts(hearts, heartCost)
  }, [isLoading, error, hearts, heartCost])

  // 初回ロード完了時のみアラート表示・自動戻り
  useEffect(() => {
    if (isLoading || hasShownAlertRef.current) return
    hasShownAlertRef.current = true

    // エラー時はチェックしない（エラー画面を表示するため）
    if (error) return

    // ハートが足りない場合はアラート表示
    if (!hasEnoughHearts(hearts, heartCost)) {
      checkHeartsAvailable(hearts, heartCost) // アラート表示
      if (autoGoBack) {
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
