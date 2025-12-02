/**
 * 詰将棋ゲームフック
 *
 * 独立した状態管理を行い、検証先行パターンで実装。
 * useShogiBoard は使用しない。
 */

import { useCallback, useState } from 'react'

import { parseSfen } from '@/lib/shogi/sfen'
import {
  getPossibleMoves,
  getDropPositions,
  makeMove,
  makeDrop,
  getPromotionOptions,
  applyMove,
} from '@/lib/shogi/moveGenerator'
import { isCheck, isCheckmate, getAllLegalMoves } from '@/lib/shogi/rules'
import { getPieceValue } from '@/lib/shogi/pieceValue'
import type { TsumeshogiProblem } from '@/mocks/tsumeshogiData'
import type { BoardState, Position, PieceType, Move } from '@/lib/shogi/types'

/** コールバック */
interface TsumeshogiCallbacks {
  /** 正解時 */
  onCorrect?: () => void
  /** 不正解時 */
  onIncorrect?: () => void
}

/** フックの戻り値 */
interface UseTsumeshogiGameReturn {
  /** 盤面状態 */
  boardState: BoardState
  /** 選択中の盤上位置 */
  selectedPosition: Position | null
  /** 選択中の持ち駒 */
  selectedCaptured: PieceType | null
  /** 移動可能なマス一覧 */
  possibleMoves: Position[]
  /** 成り選択が必要か */
  pendingPromotion: { from: Position; to: Position } | null
  /** 現在の手数 */
  currentMoveCount: number
  /** 相手思考中フラグ */
  isThinking: boolean
  /** セルタップ処理 */
  handleCellPress: (row: number, col: number) => void
  /** 持ち駒タップ処理 */
  handleCapturedPress: (pieceType: PieceType) => void
  /** 成り選択完了 */
  handlePromotionSelect: (promote: boolean) => void
  /** やり直し */
  reset: () => void
}

/**
 * 手のスコアを計算（AI応手の優先順位）
 * 詰将棋専用ロジック
 */
function getMoveScore(boardState: BoardState, move: Move): number {
  if (move.type === 'move') {
    const piece = boardState.board[move.from.row][move.from.col]

    // 1. 玉の移動は最優先（逃げ）
    if (piece?.type === 'ou') return 1000

    // 2. 攻め駒を取る
    const target = boardState.board[move.to.row][move.to.col]
    if (target) return 500 + getPieceValue(target.type)

    // 3. 合駒（ブロック）
    return 100
  }

  // 持ち駒での合駒は低優先
  return 50
}

/**
 * 最善の応手を選択（AI用）
 * 後手（gote）の視点で最善手を返す
 * 詰将棋専用ロジック
 */
function getBestEvasion(boardState: BoardState): Move | null {
  const legalMoves = getAllLegalMoves(boardState, 'gote')

  if (legalMoves.length === 0) return null

  // 優先順位でソート（降順）
  const sorted = [...legalMoves].sort((a, b) => {
    return getMoveScore(boardState, b) - getMoveScore(boardState, a)
  })

  return sorted[0]
}

/**
 * 詰将棋ゲームフック
 */
export function useTsumeshogiGame(
  problem: TsumeshogiProblem,
  callbacks?: TsumeshogiCallbacks,
): UseTsumeshogiGameReturn {
  // 初期盤面をパース
  const initialState = parseSfen(problem.sfen)

  // 盤面状態
  const [boardState, setBoardState] = useState<BoardState>(initialState)
  // 選択中の盤上位置
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  // 選択中の持ち駒
  const [selectedCaptured, setSelectedCaptured] = useState<PieceType | null>(null)
  // 移動可能なマス一覧
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])
  // 成り選択待ち
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(null)
  // 手数カウント
  const [currentMoveCount, setCurrentMoveCount] = useState(1)
  // 相手思考中フラグ
  const [isThinking, setIsThinking] = useState(false)

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedCaptured(null)
    setPossibleMoves([])
  }, [])

  // やり直し
  const reset = useCallback(() => {
    setBoardState(initialState)
    clearSelection()
    setPendingPromotion(null)
    setCurrentMoveCount(1)
    setIsThinking(false)
  }, [initialState, clearSelection])

  // 手を実行して結果を処理
  const executeMove = useCallback(
    (newState: BoardState, incrementMoveCount: boolean) => {
      // 1. 王手チェック
      if (!isCheck(newState.board, 'gote')) {
        // 王手でない → 不正解
        callbacks?.onIncorrect?.()
        reset()
        return
      }

      // 2. 詰みチェック
      if (isCheckmate(newState, 'gote')) {
        // 詰み → 正解！
        setBoardState(newState)
        if (incrementMoveCount) {
          setCurrentMoveCount((prev) => prev + 1)
        }
        clearSelection()
        callbacks?.onCorrect?.()
        return
      }

      // 3. AI応手
      setBoardState(newState)
      if (incrementMoveCount) {
        setCurrentMoveCount((prev) => prev + 1)
      }
      clearSelection()
      setIsThinking(true)

      // 少し遅延してAI応手を実行（UIの更新を見せるため）
      setTimeout(() => {
        const evasion = getBestEvasion(newState)
        if (evasion) {
          const afterAI = applyMove(newState, evasion)
          setBoardState(afterAI)
          setCurrentMoveCount((prev) => prev + 1)
        }
        setIsThinking(false)
      }, 300)
    },
    [callbacks, reset, clearSelection],
  )

  // 成り選択完了
  const handlePromotionSelect = useCallback(
    (promote: boolean) => {
      if (!pendingPromotion) return

      const { from, to } = pendingPromotion
      setPendingPromotion(null)

      const newState = makeMove(boardState, from, to, promote)
      executeMove(newState, true)
    },
    [pendingPromotion, boardState, executeMove],
  )

  // セルタップ処理
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (isThinking) return

      const targetPos = { row, col }
      const piece = boardState.board[row][col]

      // 持ち駒選択中の場合
      if (selectedCaptured) {
        // 空きマスなら打つ
        if (!piece) {
          const dropPositions = getDropPositions(boardState.board, selectedCaptured, 'sente')
          const canDrop = dropPositions.some((p) => p.row === row && p.col === col)

          if (canDrop) {
            const newState = makeDrop(boardState, selectedCaptured, targetPos, 'sente')
            clearSelection()
            executeMove(newState, true)
          } else {
            clearSelection()
          }
        } else if (piece.owner === 'sente') {
          // 自分の駒を選択
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
        // 同じ位置をクリックで選択解除
        if (selectedPosition.row === row && selectedPosition.col === col) {
          clearSelection()
          return
        }

        // 移動可能なマスなら移動
        const canMove = possibleMoves.some((p) => p.row === row && p.col === col)

        if (canMove) {
          const selectedPiece = boardState.board[selectedPosition.row][selectedPosition.col]
          if (!selectedPiece) {
            clearSelection()
            return
          }

          // 成りの選択肢を確認
          const promotions = getPromotionOptions(selectedPiece.type, selectedPosition, targetPos, 'sente')

          if (promotions.length === 2) {
            // 成り/不成り選択が必要
            setPendingPromotion({ from: selectedPosition, to: targetPos })
            clearSelection()
          } else {
            // 強制成りまたは成れない
            clearSelection()
            const newState = makeMove(boardState, selectedPosition, targetPos, promotions[0])
            executeMove(newState, true)
          }
        } else if (piece?.owner === 'sente') {
          // 別の自分の駒を選択
          setSelectedPosition(targetPos)
          const moves = getPossibleMoves(boardState.board, targetPos, piece)
          setPossibleMoves(moves)
        } else {
          clearSelection()
        }
        return
      }

      // 何も選択していない場合
      if (piece?.owner === 'sente') {
        setSelectedPosition(targetPos)
        const moves = getPossibleMoves(boardState.board, targetPos, piece)
        setPossibleMoves(moves)
      }
    },
    [boardState, selectedPosition, selectedCaptured, possibleMoves, isThinking, clearSelection, executeMove],
  )

  // 持ち駒タップ処理
  const handleCapturedPress = useCallback(
    (pieceType: PieceType) => {
      if (isThinking) return

      const hand = boardState.capturedPieces.sente
      if (!hand[pieceType]) return

      // 同じ駒を再タップで選択解除
      if (selectedCaptured === pieceType) {
        clearSelection()
        return
      }

      clearSelection()
      setSelectedCaptured(pieceType)

      // 打ち込み可能なマスを計算
      const drops = getDropPositions(boardState.board, pieceType, 'sente')
      setPossibleMoves(drops)
    },
    [boardState, selectedCaptured, isThinking, clearSelection],
  )

  return {
    boardState,
    selectedPosition,
    selectedCaptured,
    possibleMoves,
    pendingPromotion,
    currentMoveCount,
    isThinking,
    handleCellPress,
    handleCapturedPress,
    handlePromotionSelect,
    reset,
  }
}
