/**
 * 駒画像マッピング
 */

import type { PieceType } from './types'

/** 駒種から画像を取得するマッピング */
export const PIECE_IMAGES: Record<PieceType, ReturnType<typeof require>> = {
  fu: require('../../assets/images/pieces/fu.png'),
  kyo: require('../../assets/images/pieces/kyo.png'),
  kei: require('../../assets/images/pieces/kei.png'),
  gin: require('../../assets/images/pieces/gin.png'),
  kin: require('../../assets/images/pieces/kin.png'),
  kaku: require('../../assets/images/pieces/kaku.png'),
  hi: require('../../assets/images/pieces/hi.png'),
  ou: require('../../assets/images/pieces/ou.png'),
  to: require('../../assets/images/pieces/to.png'),
  narikyo: require('../../assets/images/pieces/narikyo.png'),
  narikei: require('../../assets/images/pieces/narikei.png'),
  narigin: require('../../assets/images/pieces/narigin.png'),
  uma: require('../../assets/images/pieces/uma.png'),
  ryu: require('../../assets/images/pieces/ryu.png'),
}

/** 駒種から画像を取得 */
export function getPieceImage(pieceType: PieceType) {
  return PIECE_IMAGES[pieceType]
}
