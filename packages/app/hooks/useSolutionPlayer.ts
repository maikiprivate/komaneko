/**
 * 解答再生フック
 *
 * 詰将棋の解答を1手ずつ再生する機能を提供。
 */

import { useCallback, useRef } from 'react'

import { makeDrop, makeMove } from '@/lib/shogi/moveGenerator'
import type { BoardState, PieceType, Player, Position } from '@/lib/shogi/types'

/** 解答の1手 */
export interface SolutionMove {
  from?: Position
  to: Position
  piece?: string
  promote?: boolean
}

/** 最後に指された手（ハイライト用） */
interface LastMoveHighlight {
  from?: Position
  to: Position
}

/** 再生間隔（ミリ秒） */
const SOLUTION_STEP_DELAY_MS = 1000

/** 状態更新用コールバック */
interface SolutionStateSetters {
  setBoardState: (state: BoardState) => void
  setCurrentMoveCount: (count: number) => void
  setLastMove: (move: LastMoveHighlight | null) => void
  setHintHighlight: (hint: null) => void
  setIsThinking: (value: boolean) => void
  setIsFinished: (value: boolean) => void
  setIsSolutionMode: (value: boolean) => void
  clearSelection: () => void
  clearTimer: () => void
}

interface UseSolutionPlayerParams {
  solutionMoves: SolutionMove[] | undefined
  initialState: BoardState
  playerSide: Player
  opponentSide: Player
  isSolutionMode: boolean
  stateSetters: SolutionStateSetters
}

interface UseSolutionPlayerReturn {
  playSolution: () => void
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
}

/**
 * 解答再生フック
 */
export function useSolutionPlayer({
  solutionMoves,
  initialState,
  playerSide,
  opponentSide,
  isSolutionMode,
  stateSetters,
}: UseSolutionPlayerParams): UseSolutionPlayerReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    setBoardState,
    setCurrentMoveCount,
    setLastMove,
    setHintHighlight,
    setIsThinking,
    setIsFinished,
    setIsSolutionMode,
    clearSelection,
    clearTimer,
  } = stateSetters

  const playSolution = useCallback(() => {
    if (!solutionMoves || solutionMoves.length === 0) return
    if (isSolutionMode) return

    // 盤面を初期状態にリセット
    clearTimer()
    setBoardState(initialState)
    clearSelection()
    setCurrentMoveCount(1)
    setIsThinking(false)
    setIsFinished(false)
    setLastMove(null)
    setHintHighlight(null)
    setIsSolutionMode(true)

    // 解答を1手ずつ再生
    let currentState = initialState
    let stepIndex = 0

    const playNextMove = () => {
      if (stepIndex >= solutionMoves.length) {
        // 全手順完了
        setIsSolutionMode(false)
        setIsFinished(true)
        return
      }

      const move = solutionMoves[stepIndex]
      const player = stepIndex % 2 === 0 ? playerSide : opponentSide

      // 手を適用
      if (move.piece) {
        // 打ち駒
        currentState = makeDrop(currentState, move.piece as PieceType, move.to, player)
        setLastMove({ to: move.to })
      } else if (move.from) {
        // 盤上の駒を移動
        currentState = makeMove(currentState, move.from, move.to, move.promote ?? false)
        setLastMove({ from: move.from, to: move.to })
      }

      setBoardState(currentState)
      setCurrentMoveCount(stepIndex + 1)
      stepIndex++

      // 次の手を再生
      timerRef.current = setTimeout(playNextMove, SOLUTION_STEP_DELAY_MS)
    }

    // 最初の手を少し遅延して開始
    timerRef.current = setTimeout(playNextMove, 500)
  }, [
    solutionMoves,
    isSolutionMode,
    initialState,
    playerSide,
    opponentSide,
    clearTimer,
    clearSelection,
    setBoardState,
    setCurrentMoveCount,
    setLastMove,
    setHintHighlight,
    setIsThinking,
    setIsFinished,
    setIsSolutionMode,
  ])

  return { playSolution, timerRef }
}
