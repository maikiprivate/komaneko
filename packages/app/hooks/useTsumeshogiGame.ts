/**
 * 詰将棋ゲームフック
 *
 * useShogiBoard を使用し、詰将棋固有のロジックを追加
 * - 王手チェック（checkmate.ts実装後に追加）
 * - 詰み判定（checkmate.ts実装後に追加）
 * - AI応手（checkmate.ts実装後に追加）
 */

import { useCallback, useState } from 'react'

import { useShogiBoard } from './useShogiBoard'
import type { TsumeshogiProblem } from '@/mocks/tsumeshogiData'
import type { Position, PieceType } from '@/lib/shogi/types'

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
  boardState: ReturnType<typeof useShogiBoard>['boardState']
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
 * 詰将棋ゲームフック
 */
export function useTsumeshogiGame(
  problem: TsumeshogiProblem,
  callbacks?: TsumeshogiCallbacks,
): UseTsumeshogiGameReturn {
  // 手数カウント
  const [currentMoveCount, setCurrentMoveCount] = useState(1)
  // 相手思考中フラグ
  const [isThinking, setIsThinking] = useState(false)

  // 駒移動時の処理
  const handleMove = useCallback(
    (_from: Position, _to: Position, _promote: boolean) => {
      // TODO: checkmate.ts実装後に以下を追加
      // 1. 王手チェック（王手でなければ不正解）
      // 2. 詰みチェック（詰みなら正解）
      // 3. AI応手（詰みでなければ相手が応手）

      // 現在は手数をカウントするだけ
      setCurrentMoveCount((prev) => {
        const newCount = prev + 1
        // 仮実装: 目標手数を超えたら正解扱い
        // （3手詰めなら3手目を打ち終わった時点=count>3で正解）
        if (newCount > problem.moves) {
          callbacks?.onCorrect?.()
        }
        return newCount
      })
    },
    [problem.moves, callbacks],
  )

  // 駒を打った時の処理
  const handleDrop = useCallback(
    (_pieceType: PieceType, _to: Position) => {
      // TODO: checkmate.ts実装後に王手チェック等を追加
      setCurrentMoveCount((prev) => {
        const newCount = prev + 1
        if (newCount > problem.moves) {
          callbacks?.onCorrect?.()
        }
        return newCount
      })
    },
    [problem.moves, callbacks],
  )

  // 共通フックを使用
  const shogiBoard = useShogiBoard({
    initialSfen: problem.sfen,
    playablePlayer: 'sente',
    onMove: handleMove,
    onDrop: handleDrop,
  })

  // やり直し（手数もリセット）
  const reset = useCallback(() => {
    shogiBoard.reset()
    setCurrentMoveCount(1)
    setIsThinking(false)
  }, [shogiBoard])

  return {
    boardState: shogiBoard.boardState,
    selectedPosition: shogiBoard.selectedPosition,
    selectedCaptured: shogiBoard.selectedCaptured,
    possibleMoves: shogiBoard.possibleMoves,
    pendingPromotion: shogiBoard.pendingPromotion,
    currentMoveCount,
    isThinking,
    handleCellPress: shogiBoard.handleCellPress,
    handleCapturedPress: shogiBoard.handleCapturedPress,
    handlePromotionSelect: shogiBoard.handlePromotionSelect,
    reset,
  }
}
