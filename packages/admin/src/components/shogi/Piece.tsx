/**
 * 駒コンポーネント（Web版）
 */

import type { PieceType } from '../../lib/shogi/types'
import { PIECE_NAMES } from '../../lib/shogi/types'

/** 駒画像パスを取得 */
function getPieceImagePath(type: PieceType): string {
  return `/pieces/${type}.png`
}

interface PieceProps {
  type: PieceType
  isOpponent?: boolean
  size?: number
}

export function Piece({ type, isOpponent = false, size = 32 }: PieceProps) {
  const imagePath = getPieceImagePath(type)

  return (
    <img
      src={imagePath}
      alt={PIECE_NAMES[type]}
      style={{
        width: size,
        height: size,
        transform: isOpponent ? 'rotate(180deg)' : undefined,
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      draggable={false}
    />
  )
}
