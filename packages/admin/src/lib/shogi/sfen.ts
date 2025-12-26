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
 *
 * 不正なSFENが渡された場合は空の盤面を返す
 */
export function parseSfen(sfen: string): BoardState {
  // 入力検証
  if (!sfen || typeof sfen !== 'string') {
    return createEmptyBoardState()
  }

  const parts = sfen.trim().split(/\s+/)
  if (parts.length < 2) {
    return createEmptyBoardState()
  }

  const [boardStr, turnStr, handStr] = parts

  // 盤面文字列の基本検証
  if (!boardStr || !boardStr.includes('/')) {
    return createEmptyBoardState()
  }

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
 * 空盤面のSFEN（駒が一つもない状態）
 */
export const EMPTY_BOARD_SFEN = '9/9/9/9/9/9/9/9/9 b - 1'

/**
 * 空の盤面を作成
 */
export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null))
}

/**
 * 空のBoardStateを作成
 */
export function createEmptyBoardState(): BoardState {
  return {
    board: createEmptyBoard(),
    capturedPieces: { sente: {}, gote: {} },
    turn: 'sente',
  }
}

/**
 * 初期配置の盤面を作成
 */
export function createInitialBoard(): BoardState {
  return parseSfen(INITIAL_SFEN)
}

// =============================================================================
// SFEN生成（BoardState → SFEN文字列）
// =============================================================================

/** 駒種からSFEN文字を取得 */
const PIECE_TO_SFEN: Record<PieceType, string> = {
  fu: 'P',
  kyo: 'L',
  kei: 'N',
  gin: 'S',
  kin: 'G',
  kaku: 'B',
  hi: 'R',
  ou: 'K',
  to: '+P',
  narikyo: '+L',
  narikei: '+N',
  narigin: '+S',
  uma: '+B',
  ryu: '+R',
}

/** 盤面をSFEN文字列に変換 */
function boardToSfenString(board: Board): string {
  const rows: string[] = []

  for (const row of board) {
    let rowStr = ''
    let emptyCount = 0

    for (const cell of row) {
      if (cell === null) {
        emptyCount++
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount.toString()
          emptyCount = 0
        }
        let pieceChar = PIECE_TO_SFEN[cell.type]
        if (cell.owner === 'gote') {
          // 後手は小文字（成駒の+は維持）
          if (pieceChar.startsWith('+')) {
            pieceChar = '+' + pieceChar[1].toLowerCase()
          } else {
            pieceChar = pieceChar.toLowerCase()
          }
        }
        rowStr += pieceChar
      }
    }

    if (emptyCount > 0) {
      rowStr += emptyCount.toString()
    }

    rows.push(rowStr || '9')
  }

  return rows.join('/')
}

/** 持ち駒をSFEN文字列に変換 */
function handToSfenString(capturedPieces: { sente: CapturedPieces; gote: CapturedPieces }): string {
  const handOrder: PieceType[] = ['hi', 'kaku', 'kin', 'gin', 'kei', 'kyo', 'fu']
  let result = ''

  // 先手の持ち駒（大文字）
  for (const pieceType of handOrder) {
    const count = capturedPieces.sente[pieceType] ?? 0
    if (count > 0) {
      if (count > 1) result += count.toString()
      result += PIECE_TO_SFEN[pieceType]
    }
  }

  // 後手の持ち駒（小文字）
  for (const pieceType of handOrder) {
    const count = capturedPieces.gote[pieceType] ?? 0
    if (count > 0) {
      if (count > 1) result += count.toString()
      result += PIECE_TO_SFEN[pieceType].toLowerCase()
    }
  }

  return result || '-'
}

/**
 * BoardStateをSFEN文字列に変換
 */
export function boardStateToSfen(state: BoardState): string {
  const boardStr = boardToSfenString(state.board)
  const turnStr = state.turn === 'sente' ? 'b' : 'w'
  const handStr = handToSfenString(state.capturedPieces)

  return `${boardStr} ${turnStr} ${handStr} 1`
}
