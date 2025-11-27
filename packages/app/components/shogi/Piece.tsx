/**
 * 駒コンポーネント
 */

import { Image, StyleSheet } from 'react-native'

import type { PieceType } from '../../lib/shogi/types'
import { getPieceImage } from '../../lib/shogi/pieceImages'

interface PieceProps {
  type: PieceType
  isOpponent?: boolean
  size?: number
}

export function Piece({ type, isOpponent = false, size = 32 }: PieceProps) {
  const imageSource = getPieceImage(type)

  return (
    <Image
      source={imageSource}
      style={[
        styles.piece,
        { width: size, height: size },
        isOpponent && styles.rotated,
      ]}
      resizeMode="contain"
    />
  )
}

const styles = StyleSheet.create({
  piece: {
    // 駒画像のデフォルトスタイル
  },
  rotated: {
    transform: [{ rotate: '180deg' }],
  },
})
