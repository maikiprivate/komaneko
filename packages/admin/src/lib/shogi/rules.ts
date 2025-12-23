/**
 * 将棋ルール（王手・詰み判定）
 *
 * アプリ側からコピー（packages/app/lib/shogi/rules.ts）
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
 * 合法手が1つでも存在するかを判定（早期リターン最適化）
 */
export function hasAnyLegalMove(boardState: BoardState, player: Player): boolean {
  const { board, capturedPieces } = boardState

  // 盤上の駒の移動をチェック
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
          if (!isCheck(newState.board, player)) {
            return true // 合法手発見、即リターン
          }
        }
      }
    }
  }

  // 持ち駒の打ち込みをチェック
  const hand = capturedPieces[player]
  for (const pieceType of HAND_PIECE_TYPES) {
    const count = hand[pieceType]
    if (!count || count <= 0) continue

    const dropPositions = getDropPositions(board, pieceType, player)

    for (const to of dropPositions) {
      const newState = makeDrop(boardState, pieceType, to, player)
      if (!isCheck(newState.board, player)) {
        // 打ち歩詰めチェック（歩の場合のみ）
        if (pieceType === 'fu') {
          const opponent = player === 'sente' ? 'gote' : 'sente'
          if (isCheck(newState.board, opponent) && !hasAnyLegalMoveInternal(newState, opponent)) {
            continue // 打ち歩詰めは禁止
          }
        }
        return true // 合法手発見、即リターン
      }
    }
  }

  return false // 合法手なし
}

/**
 * 打ち歩詰め判定用の内部関数（再帰呼び出し防止）
 */
function hasAnyLegalMoveInternal(boardState: BoardState, player: Player): boolean {
  const { board, capturedPieces } = boardState

  // 盤上の駒の移動のみチェック（打ち駒は省略して高速化）
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
          if (!isCheck(newState.board, player)) {
            return true
          }
        }
      }
    }
  }

  // 持ち駒の打ち込み（歩以外）
  const hand = capturedPieces[player]
  for (const pieceType of HAND_PIECE_TYPES) {
    if (pieceType === 'fu') continue // 歩は打ち歩詰めの再帰防止でスキップ
    const count = hand[pieceType]
    if (!count || count <= 0) continue

    const dropPositions = getDropPositions(board, pieceType, player)

    for (const to of dropPositions) {
      const newState = makeDrop(boardState, pieceType, to, player)
      if (!isCheck(newState.board, player)) {
        return true
      }
    }
  }

  return false
}

/**
 * 詰みかどうかを判定
 */
export function isCheckmate(boardState: BoardState, player: Player): boolean {
  // 王手されていなければ詰みではない
  if (!isCheck(boardState.board, player)) {
    return false
  }

  // 合法手があれば詰みではない（早期リターン最適化）
  return !hasAnyLegalMove(boardState, player)
}
