/**
 * 将棋の駒移動ロジック
 */

import type { Board, BoardState, CapturedPieces, Move, Piece, PieceType, Player, Position } from './types'

/** 移動方向（先手視点: row-は前進） */
type Direction = [row: number, col: number]

/** 駒の移動パターン */
interface MovePattern {
  steps?: Direction[] // 1マス移動
  slides?: Direction[] // 飛び駒（複数マス移動）
}

/** 金の動き（成駒共通） */
const GOLD_STEPS: Direction[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1], // 前3方向
  [0, -1],
  [0, 1], // 横
  [1, 0], // 真後ろ
]

/** 王の動き（全8方向） */
const KING_STEPS: Direction[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

/**
 * 駒の移動パターン定義（先手視点）
 */
const PIECE_MOVES: Record<PieceType, MovePattern> = {
  // 歩: 前に1マス
  fu: {
    steps: [[-1, 0]],
  },

  // 香: 前に何マスでも
  kyo: {
    slides: [[-1, 0]],
  },

  // 桂: 前方2マス先の左右
  kei: {
    steps: [
      [-2, -1],
      [-2, 1],
    ],
  },

  // 銀: 前3方向と斜め後ろ2方向
  gin: {
    steps: [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
  },

  // 金: 前3方向と横2方向と真後ろ
  kin: {
    steps: GOLD_STEPS,
  },

  // 角: 斜め4方向に何マスでも
  kaku: {
    slides: [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
  },

  // 飛: 縦横4方向に何マスでも
  hi: {
    slides: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
  },

  // 王: 全8方向に1マス
  ou: {
    steps: KING_STEPS,
  },

  // 成駒は金と同じ動き
  to: { steps: GOLD_STEPS },
  narikyo: { steps: GOLD_STEPS },
  narikei: { steps: GOLD_STEPS },
  narigin: { steps: GOLD_STEPS },

  // 馬: 角 + 縦横1マス
  uma: {
    steps: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    slides: [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
  },

  // 龍: 飛車 + 斜め1マス
  ryu: {
    steps: [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
    slides: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
  },
}

/** 成りマッピング */
const PROMOTE_MAP: Partial<Record<PieceType, PieceType>> = {
  fu: 'to',
  kyo: 'narikyo',
  kei: 'narikei',
  gin: 'narigin',
  kaku: 'uma',
  hi: 'ryu',
}

/** 成駒→元駒マッピング */
const UNPROMOTE_MAP: Partial<Record<PieceType, PieceType>> = {
  to: 'fu',
  narikyo: 'kyo',
  narikei: 'kei',
  narigin: 'gin',
  uma: 'kaku',
  ryu: 'hi',
}

/** 盤面内判定 */
function isInBoard(row: number, col: number): boolean {
  return row >= 0 && row < 9 && col >= 0 && col < 9
}

/**
 * 方向をプレイヤーに応じて調整
 * 後手は180度回転（row, col両方反転）
 */
function adjustDir(dir: Direction, player: Player): Direction {
  return player === 'gote' ? [-dir[0], -dir[1]] : dir
}

/**
 * 駒の移動可能位置を計算
 * 注意: 王手放置・自殺手のチェックは含まない
 */
export function getPossibleMoves(board: Board, pos: Position, piece: Piece): Position[] {
  const moves: Position[] = []
  const pattern = PIECE_MOVES[piece.type]

  // 1マス移動
  if (pattern.steps) {
    for (const dir of pattern.steps) {
      const [dr, dc] = adjustDir(dir, piece.owner)
      const newRow = pos.row + dr
      const newCol = pos.col + dc

      if (isInBoard(newRow, newCol)) {
        const target = board[newRow][newCol]
        if (!target || target.owner !== piece.owner) {
          moves.push({ row: newRow, col: newCol })
        }
      }
    }
  }

  // 飛び駒（複数マス移動）
  if (pattern.slides) {
    for (const dir of pattern.slides) {
      const [dr, dc] = adjustDir(dir, piece.owner)
      let r = pos.row + dr
      let c = pos.col + dc

      while (isInBoard(r, c)) {
        const target = board[r][c]
        if (!target) {
          moves.push({ row: r, col: c })
        } else {
          if (target.owner !== piece.owner) {
            moves.push({ row: r, col: c })
          }
          break
        }
        r += dr
        c += dc
      }
    }
  }

  return moves
}

/**
 * 持ち駒の打ち込み可能位置を計算
 * 注意: 打ち歩詰めチェックは含まない（checkmate.tsで処理）
 */
export function getDropPositions(board: Board, pieceType: PieceType, player: Player): Position[] {
  const positions: Position[] = []

  // 二歩チェック: 同じ列に自分の歩があるか
  const colHasFu: boolean[] = Array(9).fill(false)
  if (pieceType === 'fu') {
    for (let c = 0; c < 9; c++) {
      for (let r = 0; r < 9; r++) {
        const p = board[r][c]
        if (p?.type === 'fu' && p.owner === player) {
          colHasFu[c] = true
          break
        }
      }
    }
  }

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col]) continue

      // 行き場のない駒チェック
      if (pieceType === 'fu' || pieceType === 'kyo') {
        if (player === 'sente' && row === 0) continue
        if (player === 'gote' && row === 8) continue
      }
      if (pieceType === 'kei') {
        if (player === 'sente' && row <= 1) continue
        if (player === 'gote' && row >= 7) continue
      }

      // 二歩チェック
      if (pieceType === 'fu' && colHasFu[col]) continue

      positions.push({ row, col })
    }
  }

  return positions
}

/** 成れるかどうか */
export function canPromote(
  pieceType: PieceType,
  from: Position,
  to: Position,
  player: Player,
): boolean {
  if (!PROMOTE_MAP[pieceType]) return false
  const enemyZone = player === 'sente' ? [0, 1, 2] : [6, 7, 8]
  return enemyZone.includes(from.row) || enemyZone.includes(to.row)
}

/** 強制成りかどうか */
export function mustPromote(pieceType: PieceType, to: Position, player: Player): boolean {
  if (pieceType === 'fu' || pieceType === 'kyo') {
    return player === 'sente' ? to.row === 0 : to.row === 8
  }
  if (pieceType === 'kei') {
    return player === 'sente' ? to.row <= 1 : to.row >= 7
  }
  return false
}

/** 駒を成らせる */
export function promote(pieceType: PieceType): PieceType {
  return PROMOTE_MAP[pieceType] ?? pieceType
}

/** 成駒を元の駒に戻す */
export function unpromote(pieceType: PieceType): PieceType {
  return UNPROMOTE_MAP[pieceType] ?? pieceType
}

/** 盤面のディープコピー */
function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

/** 持ち駒のコピー */
function cloneCaptured(captured: CapturedPieces): CapturedPieces {
  return { ...captured }
}

/**
 * 盤上の駒を移動して新しい盤面を返す
 */
export function makeMove(
  state: BoardState,
  from: Position,
  to: Position,
  shouldPromote = false,
): BoardState {
  const board = cloneBoard(state.board)
  const captured = {
    sente: cloneCaptured(state.capturedPieces.sente),
    gote: cloneCaptured(state.capturedPieces.gote),
  }

  const piece = board[from.row][from.col]
  if (!piece) throw new Error('No piece at source')

  // 駒を取る
  const target = board[to.row][to.col]
  if (target) {
    const capturedType = unpromote(target.type)
    const hand = captured[piece.owner]
    hand[capturedType] = (hand[capturedType] ?? 0) + 1
  }

  // 移動
  board[from.row][from.col] = null
  board[to.row][to.col] = {
    type: shouldPromote ? promote(piece.type) : piece.type,
    owner: piece.owner,
  }

  return {
    board,
    capturedPieces: captured,
    turn: state.turn === 'sente' ? 'gote' : 'sente',
  }
}

/**
 * 持ち駒を打って新しい盤面を返す
 */
export function makeDrop(
  state: BoardState,
  pieceType: PieceType,
  to: Position,
  player: Player,
): BoardState {
  const board = cloneBoard(state.board)
  const captured = {
    sente: cloneCaptured(state.capturedPieces.sente),
    gote: cloneCaptured(state.capturedPieces.gote),
  }

  const hand = captured[player]
  if (!hand[pieceType]) throw new Error('No such piece in hand')

  hand[pieceType]! -= 1
  if (hand[pieceType] === 0) delete hand[pieceType]

  if (board[to.row][to.col]) throw new Error('Target not empty')

  board[to.row][to.col] = { type: pieceType, owner: player }

  return {
    board,
    capturedPieces: captured,
    turn: state.turn === 'sente' ? 'gote' : 'sente',
  }
}

/**
 * 成りの選択肢を取得
 * 成れる場合は [false, true]、強制成りなら [true]、成れない場合は [false]
 */
export function getPromotionOptions(
  pieceType: PieceType,
  from: Position,
  to: Position,
  player: Player,
): boolean[] {
  if (!canPromote(pieceType, from, to, player)) {
    return [false]
  }
  if (mustPromote(pieceType, to, player)) {
    return [true]
  }
  return [false, true]
}

/**
 * Move型の手を盤面に適用して新しい盤面を返す
 */
export function applyMove(boardState: BoardState, move: Move): BoardState {
  if (move.type === 'move') {
    return makeMove(boardState, move.from, move.to, move.promote)
  }
  return makeDrop(boardState, move.piece, move.to, boardState.turn)
}
