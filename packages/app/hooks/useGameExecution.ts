/**
 * ゲーム実行フック
 *
 * AI応答と手の実行ロジックを管理。
 */

import { useCallback, useRef } from 'react'

import { getBestEvasion } from '@/lib/shogi/ai'
import { applyMove, makeMove } from '@/lib/shogi/moveGenerator'
import { isCheck, isCheckmate } from '@/lib/shogi/rules'
import type { BoardState, Player, Position } from '@/lib/shogi/types'

/** 最後に指された手（ハイライト用） */
interface LastMoveHighlight {
  from?: Position
  to: Position
}

/** タイミング定数 */
const AI_RESPONSE_DELAY_MS = 800
const FEEDBACK_DELAY_MS = 500

/** コールバック */
interface GameCallbacks {
  onCorrect?: () => Promise<boolean>
  onIncorrect?: () => void
  onNotCheck?: () => void
}

/** 状態更新用コールバック */
interface ExecutionStateSetters {
  setBoardState: (state: BoardState | ((prev: BoardState) => BoardState)) => void
  setCurrentMoveCount: React.Dispatch<React.SetStateAction<number>>
  setLastMove: (move: LastMoveHighlight | null) => void
  setHintHighlight: (hint: null) => void
  setIsThinking: (value: boolean) => void
  setIsFinished: (value: boolean) => void
  clearSelection: () => void
}

interface UseGameExecutionParams {
  opponentSide: Player
  initialState: BoardState
  currentMoveCount: number
  maxMoves: number | undefined
  callbacks: GameCallbacks | undefined
  stateSetters: ExecutionStateSetters
}

interface UseGameExecutionReturn {
  executeMove: (newState: BoardState, moveHighlight: LastMoveHighlight) => void
  handlePromotionSelect: (
    promote: boolean,
    pendingPromotion: { from: Position; to: Position } | null,
    boardState: BoardState,
    setPendingPromotion: (value: null) => void,
  ) => void
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  clearTimer: () => void
}

/**
 * ゲーム実行フック
 */
export function useGameExecution({
  opponentSide,
  initialState,
  currentMoveCount,
  maxMoves,
  callbacks,
  stateSetters,
}: UseGameExecutionParams): UseGameExecutionReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    setBoardState,
    setCurrentMoveCount,
    setLastMove,
    setHintHighlight,
    setIsThinking,
    setIsFinished,
    clearSelection,
  } = stateSetters

  // タイマークリーンアップ
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // AI応手を実行
  const executeAIResponse = useCallback(
    (state: BoardState, onComplete?: () => void) => {
      const evasion = getBestEvasion(state, opponentSide)
      if (evasion) {
        const afterAI = applyMove(state, evasion)
        setBoardState(afterAI)
        // AI の手をハイライト
        if (evasion.type === 'move') {
          setLastMove({ from: evasion.from, to: evasion.to })
        } else {
          setLastMove({ to: evasion.to })
        }
      }
      setIsThinking(false)
      onComplete?.()
    },
    [opponentSide, setBoardState, setLastMove, setIsThinking],
  )

  // 手を実行して結果を処理
  const executeMove = useCallback(
    (newState: BoardState, moveHighlight: LastMoveHighlight) => {
      // ヒントをクリア
      setHintHighlight(null)

      // 1. 王手チェック
      if (!isCheck(newState.board, opponentSide)) {
        // 王手でない → アラートを出して手を戻す（不正解カウントはしない）
        callbacks?.onNotCheck?.()
        return
      }

      // ユーザーの手をハイライト
      setLastMove(moveHighlight)

      // 2. 詰みチェック
      if (isCheckmate(newState, opponentSide)) {
        // 詰み → 正解！
        setBoardState(newState)
        setCurrentMoveCount((prev) => prev + 1)
        clearSelection()

        // onCorrectコールバック（ハート消費など）を呼び出し、成功時のみ完了扱い
        const handleCorrect = async () => {
          const success = (await callbacks?.onCorrect?.()) ?? true
          if (success) {
            setIsFinished(true)
          } else {
            // ハート消費失敗時は盤面をリセットして再挑戦可能にする
            setBoardState(initialState)
            setCurrentMoveCount(1)
            setLastMove(null)
          }
        }
        handleCorrect()
        return
      }

      // 3. 最終手で詰まなかった場合
      if (maxMoves && currentMoveCount >= maxMoves) {
        // 規定手数の最終手だが詰みではない
        // 盤面を更新して相手の手を見せてから不正解にする
        setBoardState(newState)
        setCurrentMoveCount((prev) => prev + 1)
        clearSelection()
        setIsThinking(true)

        timerRef.current = setTimeout(() => {
          executeAIResponse(newState, () => {
            setIsFinished(true)
            // 相手の手を見せてから不正解
            timerRef.current = setTimeout(() => {
              callbacks?.onIncorrect?.()
            }, FEEDBACK_DELAY_MS)
          })
        }, AI_RESPONSE_DELAY_MS)
        return
      }

      // 4. AI応手（まだ手数が残っている場合）
      setBoardState(newState)
      setCurrentMoveCount((prev) => prev + 1)
      clearSelection()
      setIsThinking(true)

      // 少し遅延してAI応手を実行（UIの更新を見せるため）
      timerRef.current = setTimeout(() => {
        executeAIResponse(newState, () => {
          setCurrentMoveCount((prev) => prev + 1)
        })
      }, AI_RESPONSE_DELAY_MS)
    },
    [
      callbacks,
      clearSelection,
      currentMoveCount,
      maxMoves,
      executeAIResponse,
      opponentSide,
      initialState,
      setBoardState,
      setCurrentMoveCount,
      setLastMove,
      setHintHighlight,
      setIsThinking,
      setIsFinished,
    ],
  )

  // 成り選択完了
  const handlePromotionSelect = useCallback(
    (
      promote: boolean,
      pendingPromotion: { from: Position; to: Position } | null,
      boardState: BoardState,
      setPendingPromotion: (value: null) => void,
    ) => {
      if (!pendingPromotion) return

      const { from, to } = pendingPromotion
      setPendingPromotion(null)

      const newState = makeMove(boardState, from, to, promote)
      executeMove(newState, { from, to })
    },
    [executeMove],
  )

  return {
    executeMove,
    handlePromotionSelect,
    timerRef,
    clearTimer,
  }
}
