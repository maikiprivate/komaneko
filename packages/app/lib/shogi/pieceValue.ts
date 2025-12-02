/**
 * 駒の評価値
 *
 * AI応手、ヒント機能等で共通利用。
 */

import type { PieceType } from './types'

/**
 * 駒の価値
 */
export const PIECE_VALUES: Record<PieceType, number> = {
  fu: 1,
  kyo: 3,
  kei: 4,
  gin: 5,
  kin: 6,
  kaku: 8,
  hi: 10,
  ou: 0,
  to: 7,
  narikyo: 6,
  narikei: 6,
  narigin: 6,
  uma: 10,
  ryu: 12,
}

/**
 * 駒の価値を取得
 */
export function getPieceValue(pieceType: PieceType): number {
  return PIECE_VALUES[pieceType]
}
