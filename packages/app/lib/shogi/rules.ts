/**
 * 将棋ルール（王手・詰み判定）
 *
 * 詰将棋・駒塾・対局で共通利用。純粋関数として実装。
 */

import { getPossibleMoves, getDropPositions, makeMove, makeDrop, getPromotionOptions } from './moveGenerator'
import type { Board, BoardState, Move, Player, Position } from './types'
import { HAND_PIECE_TYPES } from './types'

/**
 * 指定プレイヤーの王の位置を取得
 */
export function findKing(board: Board, player: Player): Position | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col]
      if (piece && piece.type === 'ou' && piece.owner === player) {
        return { row, col }
      }
    }
  }
  return null
}

/**
 * 指定プレイヤーの王が王手されているかを判定
 *
 * @param board 盤面
 * @param player このプレイヤーの王が王手されているか
 */
export function isCheck(board: Board, player: Player): boolean {
  const kingPos = findKing(board, player)
  if (!kingPos) return false

  const opponent = player === 'sente' ? 'gote' : 'sente'

  // 相手の全駒から王の位置に到達できるかチェック
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col]
      if (piece && piece.owner === opponent) {
        const moves = getPossibleMoves(board, { row, col }, piece)
        if (moves.some((m) => m.row === kingPos.row && m.col === kingPos.col)) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * 合法手（自玉を王手にさらさない手）を全て列挙
 */
export function getAllLegalMoves(boardState: BoardState, player: Player): Move[] {
  const moves: Move[] = []
  const { board, capturedPieces } = boardState

  // 盤上の駒の移動
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col]
      if (!piece || piece.owner !== player) continue

      const from = { row, col }
      const possibleMoves = getPossibleMoves(board, from, piece)

      for (const to of possibleMoves) {
        const promotions = getPromotionOptions(piece.type, from, to, player)

        for (const promote of promotions) {
          const newState = makeMove(boardState, from, to, promote)
          // 自玉が王手されていなければ合法手
          if (!isCheck(newState.board, player)) {
            moves.push({
              type: 'move',
              from,
              to,
              piece: piece.type,
              promote,
            })
          }
        }
      }
    }
  }

  // 持ち駒の打ち込み
  const hand = capturedPieces[player]
  for (const pieceType of HAND_PIECE_TYPES) {
    const count = hand[pieceType]
    if (!count || count <= 0) continue

    const dropPositions = getDropPositions(board, pieceType, player)

    for (const to of dropPositions) {
      const newState = makeDrop(boardState, pieceType, to, player)
      // 自玉が王手されていなければ合法手
      if (!isCheck(newState.board, player)) {
        // 打ち歩詰めチェック（歩の場合のみ）
        if (pieceType === 'fu' && isDropPawnMate(boardState, to, player)) {
          continue // 打ち歩詰めは禁止
        }
        moves.push({
          type: 'drop',
          to,
          piece: pieceType,
        })
      }
    }
  }

  return moves
}

/**
 * 打ち歩詰めかどうかを判定
 */
export function isDropPawnMate(
  boardState: BoardState,
  to: Position,
  player: Player,
): boolean {
  // 歩を打った仮盤面を作成
  const newState = makeDrop(boardState, 'fu', to, player)
  const opponent = player === 'sente' ? 'gote' : 'sente'

  // 相手が詰みかどうか
  return isCheckmate(newState, opponent)
}

/**
 * 詰みかどうかを判定
 */
export function isCheckmate(boardState: BoardState, player: Player): boolean {
  // 王手されていなければ詰みではない
  if (!isCheck(boardState.board, player)) {
    return false
  }

  // 合法手がなければ詰み
  const legalMoves = getAllLegalMoves(boardState, player)
  return legalMoves.length === 0
}
