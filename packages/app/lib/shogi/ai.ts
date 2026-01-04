/**
 * 将棋AI（応手選択ロジック）
 *
 * 詰将棋の玉方（防御側）の応手選択に使用。
 */

import { makeMove, makeDrop } from './moveGenerator'
import { getPieceValue } from './pieceValue'
import { getAllLegalMoves, isCheckmate } from './rules'
import type { BoardState, Move, Player } from './types'

/**
 * 手を実行した後の盤面を取得
 */
function applyMoveForDefender(
  boardState: BoardState,
  move: Move,
  defender: Player,
): BoardState {
  if (move.type === 'move') {
    return makeMove(boardState, move.from, move.to, move.promote ?? false)
  } else {
    return makeDrop(boardState, move.piece, move.to, defender)
  }
}

/**
 * 手のスコアを計算（AI応手の優先順位）
 * 詰将棋専用ロジック
 *
 * 優先順位:
 * 1. 即詰みにならない手を優先
 * 2. 駒を取る手（攻撃力削減）
 * 3. 玉が逃げる
 * 4. 合駒でブロック
 *
 * @param defender 玉方（防御側）のプレイヤー
 */
function getMoveScore(boardState: BoardState, move: Move, defender: Player): number {
  // この手を打った後の盤面を計算
  const newState = applyMoveForDefender(boardState, move, defender)

  // 即詰みになる手は大幅減点
  // （相手が次に詰ませられる場合）
  if (isCheckmate(newState, defender)) {
    return -1000
  }

  // 即詰みにならない手の中での優先順位
  if (move.type === 'move') {
    const piece = boardState.board[move.from.row][move.from.col]
    const target = boardState.board[move.to.row][move.to.col]

    // 1. 玉が攻め駒を取る（王手から逃げつつ攻め駒を除去）
    if (piece?.type === 'ou' && target) {
      return 2000 + getPieceValue(target.type)
    }

    // 2. 他の駒で攻め駒を取る
    if (target) {
      return 1000 + getPieceValue(target.type)
    }

    // 3. 玉の移動（逃げ）
    if (piece?.type === 'ou') {
      return 500
    }

    // 4. 合駒（ブロック）
    return 100
  }

  // 5. 持ち駒での合駒は低優先
  return 50
}

/**
 * 最善の応手を選択（AI用）
 * 玉方（defender）の視点で最善手を返す
 * 詰将棋専用ロジック
 *
 * @param boardState 現在の盤面
 * @param defender 玉方（防御側）のプレイヤー
 */
export function getBestEvasion(boardState: BoardState, defender: Player): Move | null {
  const legalMoves = getAllLegalMoves(boardState, defender)

  if (legalMoves.length === 0) return null

  // 優先順位でソート（降順）
  const sorted = [...legalMoves].sort((a, b) => {
    return getMoveScore(boardState, b, defender) - getMoveScore(boardState, a, defender)
  })

  return sorted[0]
}
