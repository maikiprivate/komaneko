/**
 * 詰将棋ゲームフック
 *
 * 独立した状態管理を行い、検証先行パターンで実装。
 * AI応答と解答再生のロジックは別フックに分離。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  getDropPositions,
  getPossibleMoves,
  getPromotionOptions,
  makeDrop,
  makeMove,
} from '@/lib/shogi/moveGenerator'
import { parseSfen } from '@/lib/shogi/sfen'
import type { BoardState, PieceType, Player, Position } from '@/lib/shogi/types'

import { useGameExecution } from './useGameExecution'
import { type SolutionMove, useSolutionPlayer } from './useSolutionPlayer'

/** 詰将棋問題型（フック用） */
export interface TsumeshogiProblemForGame {
  sfen: string
  moves: number
  hint?: {
    from?: { row: number; col: number }
    to: { row: number; col: number }
    piece?: PieceType
  }
  solutionMoves?: SolutionMove[]
}

/** コールバック */
interface TsumeshogiCallbacks {
  /** 正解時（ハート消費など）。falseを返すと完了にならない */
  onCorrect?: () => Promise<boolean>
  /** 不正解時 */
  onIncorrect?: () => void
  /** 王手でない手を指した時 */
  onNotCheck?: () => void
}

/** 最後に指された手（ハイライト用） */
interface LastMoveHighlight {
  from?: Position
  to: Position
}

/** ヒントのハイライト情報 */
interface HintHighlight {
  from?: Position
  to: Position
  piece?: PieceType
}

/** フックの戻り値 */
interface UseTsumeshogiGameReturn {
  boardState: BoardState
  selectedPosition: Position | null
  selectedCaptured: PieceType | null
  possibleMoves: Position[]
  pendingPromotion: { from: Position; to: Position } | null
  currentMoveCount: number
  isThinking: boolean
  isFinished: boolean
  lastMove: LastMoveHighlight | null
  hintHighlight: HintHighlight | null
  isSolutionMode: boolean
  playerSide: Player
  handleCellPress: (row: number, col: number) => void
  handleCapturedPress: (pieceType: PieceType) => void
  handlePromotionSelect: (promote: boolean) => void
  reset: () => void
  showHint: () => void
  playSolution: () => void
}

/** 空の盤面状態（problem未定義時のフォールバック） */
const EMPTY_BOARD_STATE: BoardState = {
  board: Array(9)
    .fill(null)
    .map(() => Array(9).fill(null)),
  capturedPieces: { sente: {}, gote: {} },
  turn: 'sente',
}

/**
 * 詰将棋ゲームフック
 */
export function useTsumeshogiGame(
  problem: TsumeshogiProblemForGame | undefined,
  callbacks?: TsumeshogiCallbacks,
): UseTsumeshogiGameReturn & { isReady: boolean } {
  // 初期盤面をパース（メモ化）
  // biome-ignore lint/correctness/useExhaustiveDependencies: sfenのみで十分（movesやhintの変更では再パースしない）
  const initialState = useMemo(
    () => (problem ? parseSfen(problem.sfen) : EMPTY_BOARD_STATE),
    [problem?.sfen],
  )

  // プレイヤー側（攻め方）と相手側（玉方）
  const playerSide: Player = initialState.turn
  const opponentSide: Player = playerSide === 'sente' ? 'gote' : 'sente'

  // ===== 基本状態 =====
  const [boardState, setBoardState] = useState<BoardState>(initialState)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedCaptured, setSelectedCaptured] = useState<PieceType | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(
    null,
  )
  const [currentMoveCount, setCurrentMoveCount] = useState(1)
  const [isThinking, setIsThinking] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [lastMove, setLastMove] = useState<LastMoveHighlight | null>(null)
  const [hintHighlight, setHintHighlight] = useState<HintHighlight | null>(null)
  const [isSolutionMode, setIsSolutionMode] = useState(false)

  // problem が変わったら盤面をリセット
  useEffect(() => {
    setBoardState(initialState)
  }, [initialState])

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedCaptured(null)
    setPossibleMoves([])
  }, [])

  // ===== ゲーム実行フック =====
  const {
    executeMove,
    handlePromotionSelect: execHandlePromotion,
    timerRef: execTimerRef,
    clearTimer,
  } = useGameExecution({
    opponentSide,
    initialState,
    currentMoveCount,
    maxMoves: problem?.moves,
    callbacks,
    stateSetters: {
      setBoardState,
      setCurrentMoveCount,
      setLastMove,
      setHintHighlight,
      setIsThinking,
      setIsFinished,
      clearSelection,
    },
  })

  // ===== 解答再生フック =====
  const { playSolution, timerRef: solutionTimerRef } = useSolutionPlayer({
    solutionMoves: problem?.solutionMoves,
    initialState,
    playerSide,
    opponentSide,
    isSolutionMode,
    stateSetters: {
      setBoardState,
      setCurrentMoveCount,
      setLastMove,
      setHintHighlight,
      setIsThinking,
      setIsFinished,
      setIsSolutionMode,
      clearSelection,
      clearTimer,
    },
  })

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearTimer()
      if (solutionTimerRef.current) {
        clearTimeout(solutionTimerRef.current)
      }
    }
  }, [clearTimer, solutionTimerRef])

  // やり直し
  const reset = useCallback(() => {
    clearTimer()
    if (solutionTimerRef.current) {
      clearTimeout(solutionTimerRef.current)
      solutionTimerRef.current = null
    }
    setBoardState(initialState)
    clearSelection()
    setPendingPromotion(null)
    setCurrentMoveCount(1)
    setIsThinking(false)
    setIsFinished(false)
    setLastMove(null)
    setHintHighlight(null)
    setIsSolutionMode(false)
  }, [initialState, clearSelection, clearTimer, solutionTimerRef])

  // ヒント表示
  const showHint = useCallback(() => {
    if (isFinished || isThinking || isSolutionMode) return
    if (!problem?.hint) return
    if (currentMoveCount !== 1) return

    setHintHighlight({
      from: problem.hint.from,
      to: problem.hint.to,
      piece: problem.hint.piece,
    })
  }, [isFinished, isThinking, isSolutionMode, problem?.hint, currentMoveCount])

  // 成り選択完了（ラッパー）
  const handlePromotionSelect = useCallback(
    (promote: boolean) => {
      execHandlePromotion(promote, pendingPromotion, boardState, setPendingPromotion)
    },
    [execHandlePromotion, pendingPromotion, boardState],
  )

  // セルタップ処理
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (isThinking || isFinished || isSolutionMode) return

      const targetPos = { row, col }
      const piece = boardState.board[row][col]

      // 持ち駒選択中の場合
      if (selectedCaptured) {
        if (!piece) {
          const dropPositions = getDropPositions(boardState.board, selectedCaptured, playerSide)
          const canDrop = dropPositions.some((p) => p.row === row && p.col === col)

          if (canDrop) {
            const newState = makeDrop(boardState, selectedCaptured, targetPos, playerSide)
            clearSelection()
            executeMove(newState, { to: targetPos })
          } else {
            clearSelection()
          }
        } else if (piece.owner === playerSide) {
          clearSelection()
          setSelectedPosition(targetPos)
          const moves = getPossibleMoves(boardState.board, targetPos, piece)
          setPossibleMoves(moves)
        } else {
          clearSelection()
        }
        return
      }

      // 盤上の駒選択中の場合
      if (selectedPosition) {
        if (selectedPosition.row === row && selectedPosition.col === col) {
          clearSelection()
          return
        }

        const canMove = possibleMoves.some((p) => p.row === row && p.col === col)

        if (canMove) {
          const selectedPiece = boardState.board[selectedPosition.row][selectedPosition.col]
          if (!selectedPiece) {
            clearSelection()
            return
          }

          const promotions = getPromotionOptions(
            selectedPiece.type,
            selectedPosition,
            targetPos,
            playerSide,
          )

          if (promotions.length === 2) {
            setPendingPromotion({ from: selectedPosition, to: targetPos })
            clearSelection()
          } else {
            const from = selectedPosition
            clearSelection()
            const newState = makeMove(boardState, from, targetPos, promotions[0])
            executeMove(newState, { from, to: targetPos })
          }
        } else if (piece?.owner === playerSide) {
          setSelectedPosition(targetPos)
          const moves = getPossibleMoves(boardState.board, targetPos, piece)
          setPossibleMoves(moves)
        } else {
          clearSelection()
        }
        return
      }

      // 何も選択していない場合
      if (piece?.owner === playerSide) {
        setSelectedPosition(targetPos)
        const moves = getPossibleMoves(boardState.board, targetPos, piece)
        setPossibleMoves(moves)
      }
    },
    [
      boardState,
      selectedPosition,
      selectedCaptured,
      possibleMoves,
      isThinking,
      isFinished,
      isSolutionMode,
      clearSelection,
      executeMove,
      playerSide,
    ],
  )

  // 持ち駒タップ処理
  const handleCapturedPress = useCallback(
    (pieceType: PieceType) => {
      if (isThinking || isFinished || isSolutionMode) return

      const hand = boardState.capturedPieces[playerSide]
      if (!hand[pieceType]) return

      if (selectedCaptured === pieceType) {
        clearSelection()
        return
      }

      clearSelection()
      setSelectedCaptured(pieceType)
      const drops = getDropPositions(boardState.board, pieceType, playerSide)
      setPossibleMoves(drops)
    },
    [
      boardState,
      selectedCaptured,
      isThinking,
      isFinished,
      isSolutionMode,
      clearSelection,
      playerSide,
    ],
  )

  return {
    isReady: problem !== undefined,
    boardState,
    selectedPosition,
    selectedCaptured,
    possibleMoves,
    pendingPromotion,
    currentMoveCount,
    isThinking,
    isFinished,
    lastMove,
    hintHighlight,
    isSolutionMode,
    playerSide,
    handleCellPress,
    handleCapturedPress,
    handlePromotionSelect,
    reset,
    showHint,
    playSolution,
  }
}
