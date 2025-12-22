/**
 * 将棋の型定義
 */

/** プレイヤー（先手/後手） */
export type Player = 'sente' | 'gote'

/** 視点（どちら側から盤面を見るか） */
export type Perspective = 'sente' | 'gote'

/** 駒の種類 */
export type PieceType =
  | 'fu'    // 歩
  | 'kyo'   // 香
  | 'kei'   // 桂
  | 'gin'   // 銀
  | 'kin'   // 金
  | 'kaku'  // 角
  | 'hi'    // 飛
  | 'ou'    // 王/玉
  | 'to'    // と（成歩）
  | 'narikyo'  // 成香
  | 'narikei'  // 成桂
  | 'narigin'  // 成銀
  | 'uma'   // 馬（成角）
  | 'ryu'   // 龍（成飛）

/** 駒 */
export interface Piece {
  type: PieceType
  owner: Player
}

/** 盤上の位置（0-indexed） */
export interface Position {
  row: number  // 0-8（一段目-九段目）
  col: number  // 0-8（9筋-1筋）
}

/** 盤面（9x9の2次元配列） */
export type Board = (Piece | null)[][]

/** 持ち駒 */
export type CapturedPieces = Partial<Record<PieceType, number>>

/** 盤面の状態 */
export interface BoardState {
  board: Board
  capturedPieces: {
    sente: CapturedPieces
    gote: CapturedPieces
  }
  turn: Player
}

/** SFEN形式の駒文字マッピング */
export const SFEN_TO_PIECE: Record<string, PieceType> = {
  P: 'fu',
  L: 'kyo',
  N: 'kei',
  S: 'gin',
  G: 'kin',
  B: 'kaku',
  R: 'hi',
  K: 'ou',
  '+P': 'to',
  '+L': 'narikyo',
  '+N': 'narikei',
  '+S': 'narigin',
  '+B': 'uma',
  '+R': 'ryu',
}

/** 駒の日本語名 */
export const PIECE_NAMES: Record<PieceType, string> = {
  fu: '歩',
  kyo: '香',
  kei: '桂',
  gin: '銀',
  kin: '金',
  kaku: '角',
  hi: '飛',
  ou: '王',
  to: 'と',
  narikyo: '成香',
  narikei: '成桂',
  narigin: '成銀',
  uma: '馬',
  ryu: '龍',
}

/** 持ち駒として使える駒（成駒以外） */
export const HAND_PIECE_TYPES: PieceType[] = [
  'hi', 'kaku', 'kin', 'gin', 'kei', 'kyo', 'fu',
]
