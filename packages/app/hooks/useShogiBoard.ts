/**
 * 将棋盤操作の共通フック
 *
 * 詰将棋・駒塾で共通利用する盤面操作ロジックを提供
 */

import { useState, useCallback, useMemo } from 'react'

import {
  getPossibleMoves,
  getDropPositions,
  makeMove,
  makeDrop,
  canPromote,
  mustPromote,
} from '@/lib/shogi/moveGenerator'
import { parseSfen } from '@/lib/shogi/sfen'
import type { BoardState, PieceType, Player, Position } from '@/lib/shogi/types'

/** フックの引数 */
interface UseShogiboardOptions {
  /** 初期SFEN */
  initialSfen: string
  /** 操作可能なプレイヤー（デフォルト: sente） */
  playablePlayer?: Player
  /** 駒移動時のコールバック */
  onMove?: (from: Position, to: Position, promote: boolean) => void
  /** 駒を打った時のコールバック */
  onDrop?: (pieceType: PieceType, to: Position) => void
}

/** フックの戻り値 */
interface UseShogiboardReturn {
  /** 現在の盤面状態 */
  boardState: BoardState
  /** 選択中の盤上位置 */
  selectedPosition: Position | null
  /** 選択中の持ち駒 */
  selectedCaptured: PieceType | null
  /** 移動可能なマス一覧 */
  possibleMoves: Position[]
  /** 成り選択が必要か */
  pendingPromotion: { from: Position; to: Position } | null
  /** セルタップ処理 */
  handleCellPress: (row: number, col: number) => void
  /** 持ち駒タップ処理 */
  handleCapturedPress: (pieceType: PieceType) => void
  /** 成り選択完了 */
  handlePromotionSelect: (promote: boolean) => void
  /** 盤面リセット */
  reset: () => void
  /** 手動で盤面を設定（AI応手用） */
  setBoardState: (state: BoardState) => void
}

/**
 * 将棋盤操作の共通フック
 */
export function useShogiBoard({
  initialSfen,
  playablePlayer = 'sente',
  onMove,
  onDrop,
}: UseShogiboardOptions): UseShogiboardReturn {
  // 初期状態をパース（メモ化して不要な再生成を防ぐ）
  const initialBoardState = useMemo<BoardState>(() => {
    const parsed = parseSfen(initialSfen)
    return {
      board: parsed.board,
      capturedPieces: parsed.capturedPieces,
      turn: playablePlayer,
    }
  }, [initialSfen, playablePlayer])

  // 状態
  const [boardState, setBoardState] = useState<BoardState>(initialBoardState)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedCaptured, setSelectedCaptured] = useState<PieceType | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(null)

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedCaptured(null)
    setPossibleMoves([])
  }, [])

  // 盤面リセット
  const reset = useCallback(() => {
    setBoardState(initialBoardState)
    clearSelection()
    setPendingPromotion(null)
  }, [initialBoardState, clearSelection])

  // セルタップ処理
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      // 成り選択中は無視
      if (pendingPromotion) return

      const piece = boardState.board[row][col]

      // 持ち駒選択中に空きマスをタップ → 打つ
      if (selectedCaptured && !piece) {
        if (possibleMoves.some((p) => p.row === row && p.col === col)) {
          const newState = makeDrop(boardState, selectedCaptured, { row, col }, boardState.turn)
          setBoardState(newState)
          onDrop?.(selectedCaptured, { row, col })
          clearSelection()
        }
        return
      }

      // 移動可能マスをタップ → 移動
      if (selectedPosition && possibleMoves.some((p) => p.row === row && p.col === col)) {
        const movingPiece = boardState.board[selectedPosition.row][selectedPosition.col]
        if (!movingPiece) return

        const from = selectedPosition
        const to = { row, col }

        // 成り判定
        const canProm = canPromote(movingPiece.type, from, to, boardState.turn)
        const mustProm = mustPromote(movingPiece.type, to, boardState.turn)

        if (mustProm) {
          // 強制成り
          const newState = makeMove(boardState, from, to, true)
          setBoardState(newState)
          onMove?.(from, to, true)
          clearSelection()
        } else if (canProm) {
          // 成り選択ダイアログを表示
          setPendingPromotion({ from, to })
        } else {
          // 成れない
          const newState = makeMove(boardState, from, to, false)
          setBoardState(newState)
          onMove?.(from, to, false)
          clearSelection()
        }
        return
      }

      // 自分の駒をタップ
      if (piece && piece.owner === boardState.turn) {
        // 同じ駒を再タップ → 選択解除
        if (selectedPosition && selectedPosition.row === row && selectedPosition.col === col) {
          clearSelection()
          return
        }
        // 別の駒を選択
        setSelectedPosition({ row, col })
        setSelectedCaptured(null)
        const moves = getPossibleMoves(boardState.board, { row, col }, piece)
        setPossibleMoves(moves)
        return
      }

      // それ以外 → 選択解除
      clearSelection()
    },
    [boardState, selectedPosition, selectedCaptured, possibleMoves, pendingPromotion, onMove, onDrop, clearSelection],
  )

  // 持ち駒タップ処理
  const handleCapturedPress = useCallback(
    (pieceType: PieceType) => {
      // 成り選択中は無視
      if (pendingPromotion) return

      const hand = boardState.capturedPieces[boardState.turn]
      if (!hand[pieceType]) return

      // 同じ駒を再タップ → 選択解除
      if (selectedCaptured === pieceType) {
        clearSelection()
        return
      }

      // 持ち駒を選択
      setSelectedCaptured(pieceType)
      setSelectedPosition(null)
      const drops = getDropPositions(boardState.board, pieceType, boardState.turn)
      setPossibleMoves(drops)
    },
    [boardState, selectedCaptured, pendingPromotion, clearSelection],
  )

  // 成り選択完了
  const handlePromotionSelect = useCallback(
    (promote: boolean) => {
      if (!pendingPromotion) return

      const { from, to } = pendingPromotion
      const newState = makeMove(boardState, from, to, promote)
      setBoardState(newState)
      onMove?.(from, to, promote)
      setPendingPromotion(null)
      clearSelection()
    },
    [boardState, pendingPromotion, onMove, clearSelection],
  )

  return {
    boardState,
    selectedPosition,
    selectedCaptured,
    possibleMoves,
    pendingPromotion,
    handleCellPress,
    handleCapturedPress,
    handlePromotionSelect,
    reset,
    setBoardState,
  }
}
