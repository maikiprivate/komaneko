/**
 * SFEN（Shogi Forsyth-Edwards Notation）解析
 *
 * SFEN形式: "盤面 手番 持ち駒 手数"
 * 例: "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1"
 */

import type { Board, BoardState, CapturedPieces, Piece, PieceType, Player } from './types'
import { SFEN_TO_PIECE } from './types'

/** SFEN文字から駒種を取得 */
function sfenCharToPieceType(char: string, isPromoted: boolean): PieceType | null {
  const key = isPromoted ? `+${char.toUpperCase()}` : char.toUpperCase()
  return SFEN_TO_PIECE[key] ?? null
}

/** SFEN文字からプレイヤーを判定（大文字=先手、小文字=後手） */
function sfenCharToPlayer(char: string): Player {
  return char === char.toUpperCase() ? 'sente' : 'gote'
}

/** 盤面文字列を解析 */
function parseBoardString(boardStr: string): Board {
  const board: Board = []
  const rows = boardStr.split('/')

  for (const row of rows) {
    const boardRow: (Piece | null)[] = []
    let isPromoted = false

    for (const char of row) {
      if (char === '+') {
        isPromoted = true
        continue
      }

      const num = parseInt(char, 10)
      if (!isNaN(num)) {
        // 数字は空マスの数
        for (let i = 0; i < num; i++) {
          boardRow.push(null)
        }
      } else {
        // 駒
        const pieceType = sfenCharToPieceType(char, isPromoted)
        if (pieceType) {
          boardRow.push({
            type: pieceType,
            owner: sfenCharToPlayer(char),
          })
        }
        isPromoted = false
      }
    }

    board.push(boardRow)
  }

  return board
}

/** 持ち駒文字列を解析 */
function parseHandString(handStr: string): { sente: CapturedPieces; gote: CapturedPieces } {
  const result: { sente: CapturedPieces; gote: CapturedPieces } = {
    sente: {},
    gote: {},
  }

  if (handStr === '-') {
    return result
  }

  let count = 0
  for (const char of handStr) {
    const num = parseInt(char, 10)
    if (!isNaN(num)) {
      count = count * 10 + num
      continue
    }

    const pieceType = sfenCharToPieceType(char, false)
    if (pieceType) {
      const player = sfenCharToPlayer(char)
      const actualCount = count === 0 ? 1 : count
      result[player][pieceType] = actualCount
    }
    count = 0
  }

  return result
}

/**
 * SFEN文字列を解析してBoardStateを返す
 */
export function parseSfen(sfen: string): BoardState {
  const parts = sfen.trim().split(/\s+/)
  const [boardStr, turnStr, handStr] = parts

  const board = parseBoardString(boardStr)
  const turn: Player = turnStr === 'b' ? 'sente' : 'gote'
  const capturedPieces = parseHandString(handStr || '-')

  return {
    board,
    turn,
    capturedPieces,
  }
}

/**
 * 初期配置のSFEN
 */
export const INITIAL_SFEN = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1'

/**
 * 空の盤面を作成
 */
export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null))
}

/**
 * 初期配置の盤面を作成
 */
export function createInitialBoard(): BoardState {
  return parseSfen(INITIAL_SFEN)
}
