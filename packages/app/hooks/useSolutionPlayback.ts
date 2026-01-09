/**
 * 解答再生フック
 *
 * カットイン表示 → 駒移動（複数手対応） → カットイン表示 → リセット の流れを管理
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PieceType, Position } from '@/lib/shogi/types'
import type { SequenceMove } from '@/mocks/lessonData'

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
  piece?: PieceType
}

/** 解答再生の設定 */
interface SolutionPlaybackConfig {
  /** 正解の手順（単一手または複数手） */
  moves: SequenceMove[]
  /** 盤面のSFEN */
  sfen: string
}

/** 解答再生のコールバック */
interface SolutionPlaybackCallbacks {
  /** 手を実行する（移動または駒打ち） */
  onMove: (move: SequenceMove, moveIndex: number) => void
  /** 盤面をリセットする */
  onBoardReset: (sfen: string) => void
  /** 再生開始前の準備処理 */
  onPrepare?: () => void
}

/** 解答再生のタイミング設定（ミリ秒） */
const SOLUTION_TIMING = {
  /** 最初のカットイン表示時間 */
  FIRST_CUTIN: 1000,
  /** カットイン消えてから最初の駒が動くまでの待機時間 */
  BEFORE_FIRST_MOVE: 500,
  /** 各手の間隔 */
  BETWEEN_MOVES: 800,
  /** 最後の駒が動いてから次のカットインまでの待機時間 */
  AFTER_LAST_MOVE: 1200,
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
 *
 * 複数手順・駒打ちに対応
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

  // 解答再生を実行（複数手順対応版）
  const play = useCallback(
    (config: SolutionPlaybackConfig, callbacks: SolutionPlaybackCallbacks) => {
      // 既に再生中の場合は何もしない
      if (phase !== 'none') return

      const { moves, sfen } = config
      const { onMove, onBoardReset, onPrepare } = callbacks

      // 手順がない場合は何もしない
      if (moves.length === 0) return

      clearTimer()
      onPrepare?.()
      setLastMove(null)

      // Phase 1: 「正解を見せるにゃ！」カットイン表示
      setPhase('showing')

      timerRef.current = setTimeout(() => {
        // Phase 2: カットイン非表示 → 手順再生開始
        setPhase('playing')

        let currentMoveIndex = 0

        // 全手順完了後の処理
        const finishPlayback = () => {
          timerRef.current = setTimeout(() => {
            // Phase 3: 「こうやって動かすにゃ！」カットイン表示
            setPhase('shown')

            timerRef.current = setTimeout(() => {
              // Phase 4: 盤面リセット、通常状態に戻る
              onBoardReset(sfen)
              setPhase('none')
              setLastMove(null)
            }, SOLUTION_TIMING.SECOND_CUTIN)
          }, SOLUTION_TIMING.AFTER_LAST_MOVE)
        }

        const playNextMove = () => {
          const move = moves[currentMoveIndex]

          // 手を実行
          onMove(move, currentMoveIndex)

          // ハイライト更新
          if (move.type === 'move' && move.from) {
            setLastMove({ from: move.from, to: move.to })
          } else if (move.type === 'drop') {
            setLastMove({ to: move.to, piece: move.piece })
          }

          currentMoveIndex++

          // 次の手があれば続行、なければ完了処理へ
          if (currentMoveIndex < moves.length) {
            timerRef.current = setTimeout(playNextMove, SOLUTION_TIMING.BETWEEN_MOVES)
          } else {
            finishPlayback()
          }
        }

        // 最初の手を実行（少し待ってから）
        timerRef.current = setTimeout(playNextMove, SOLUTION_TIMING.BEFORE_FIRST_MOVE)
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
