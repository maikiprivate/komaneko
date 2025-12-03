/**
 * 将棋AI（応手選択ロジック）
 *
 * 詰将棋の後手（防御側）の応手選択に使用。
 */

import { getAllLegalMoves } from './rules'
import { getPieceValue } from './pieceValue'
import type { BoardState, Move } from './types'

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
export function getBestEvasion(boardState: BoardState): Move | null {
  const legalMoves = getAllLegalMoves(boardState, 'gote')

  if (legalMoves.length === 0) return null

  // 優先順位でソート（降順）
  const sorted = [...legalMoves].sort((a, b) => {
    return getMoveScore(boardState, b) - getMoveScore(boardState, a)
  })

  return sorted[0]
}
