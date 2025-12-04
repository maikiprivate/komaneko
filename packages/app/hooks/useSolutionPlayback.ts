/**
 * 解答再生フック
 *
 * カットイン表示 → 駒移動 → カットイン表示 → リセット の流れを管理
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Position } from '@/lib/shogi/types'

// =============================================================================
// 型定義
// =============================================================================

/** 解答再生のフェーズ */
export type SolutionPhase = 'none' | 'showing' | 'playing' | 'shown'

/** 移動のハイライト情報 */
export interface MoveHighlight {
  from?: Position
  to: Position
  /** 持ち駒のヒント表示用（打つ駒の種類） */
  piece?: string
}

/** 解答再生の設定 */
interface SolutionPlaybackConfig {
  /** 正解の手 */
  correctMove: {
    from: Position
    to: Position
    promote?: boolean
  }
  /** 盤面のSFEN */
  sfen: string
}

/** 解答再生のコールバック */
interface SolutionPlaybackCallbacks {
  /** 盤面を更新する */
  onBoardUpdate: (sfen: string, move: { from: Position; to: Position; promote: boolean }) => void
  /** 盤面をリセットする */
  onBoardReset: (sfen: string) => void
  /** 再生開始前の準備処理 */
  onPrepare?: () => void
}

/** 解答再生のタイミング設定（ミリ秒） */
const SOLUTION_TIMING = {
  /** 最初のカットイン表示時間 */
  FIRST_CUTIN: 1000,
  /** カットイン消えてから駒が動くまでの待機時間 */
  BEFORE_MOVE: 500,
  /** 駒が動いてから次のカットインまでの待機時間 */
  AFTER_MOVE: 1200,
  /** 2回目のカットイン表示時間 */
  SECOND_CUTIN: 1500,
} as const

/** カットインメッセージ */
const CUT_IN_MESSAGES = {
  showing: '正解を見せるにゃ！',
  shown: 'こうやって動かすにゃ！もう一度やってみてにゃ〜',
} as const

// =============================================================================
// フック
// =============================================================================

/**
 * 解答再生を管理するフック
 */
export function useSolutionPlayback() {
  // 解答再生フェーズ
  const [phase, setPhase] = useState<SolutionPhase>('none')

  // 最後に指された手（ハイライト用）
  const [lastMove, setLastMove] = useState<MoveHighlight | null>(null)

  // タイマー参照（クリーンアップ用）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // タイマークリーンアップ
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearTimer()
      setPhase('none')
    }
  }, [clearTimer])

  // 解答再生を実行
  const play = useCallback(
    (config: SolutionPlaybackConfig, callbacks: SolutionPlaybackCallbacks) => {
      // 既に再生中の場合は何もしない
      if (phase !== 'none') return

      const { correctMove, sfen } = config
      const { onBoardUpdate, onBoardReset, onPrepare } = callbacks

      clearTimer()
      onPrepare?.()
      setLastMove(null)

      // Phase 1: 「正解を見せるにゃ！」カットイン表示
      setPhase('showing')

      timerRef.current = setTimeout(() => {
        // Phase 2: カットイン非表示 → 駒移動準備
        setPhase('playing')

        timerRef.current = setTimeout(() => {
          // Phase 2.5: 駒を動かす
          onBoardUpdate(sfen, {
            from: correctMove.from,
            to: correctMove.to,
            promote: correctMove.promote ?? false,
          })
          setLastMove({ from: correctMove.from, to: correctMove.to })

          timerRef.current = setTimeout(() => {
            // Phase 3: 「こうやって動かすにゃ！」カットイン表示
            setPhase('shown')

            timerRef.current = setTimeout(() => {
              // Phase 4: 盤面リセット、通常状態に戻る
              onBoardReset(sfen)
              setPhase('none')
              setLastMove(null)
            }, SOLUTION_TIMING.SECOND_CUTIN)
          }, SOLUTION_TIMING.AFTER_MOVE)
        }, SOLUTION_TIMING.BEFORE_MOVE)
      }, SOLUTION_TIMING.FIRST_CUTIN)
    },
    [phase, clearTimer],
  )

  // 再生を中断してリセット
  const reset = useCallback(() => {
    clearTimer()
    setPhase('none')
    setLastMove(null)
  }, [clearTimer])

  // カットイン用メッセージ
  const cutInMessage = useMemo(() => {
    if (phase === 'showing') return CUT_IN_MESSAGES.showing
    if (phase === 'shown') return CUT_IN_MESSAGES.shown
    return ''
  }, [phase])

  // カットイン表示フラグ
  const isCutInVisible = phase === 'showing' || phase === 'shown'

  // 再生中かどうか
  const isPlaying = phase !== 'none'

  return {
    /** 現在のフェーズ */
    phase,
    /** 最後に指された手のハイライト */
    lastMove,
    /** カットインメッセージ */
    cutInMessage,
    /** カットインを表示するか */
    isCutInVisible,
    /** 再生中かどうか */
    isPlaying,
    /** 解答再生を実行 */
    play,
    /** 再生を中断してリセット */
    reset,
  }
}
