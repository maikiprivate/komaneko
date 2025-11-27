/**
 * 駒台コンポーネント（持ち駒表示）
 */

import { StyleSheet, View, Text } from 'react-native'

import type { CapturedPieces } from '../../lib/shogi/types'
import { HAND_PIECE_TYPES } from '../../lib/shogi/types'
import { Piece } from './Piece'

interface PieceStandProps {
  pieces: CapturedPieces
  isOpponent?: boolean
  pieceSize?: number
  label?: string
  width?: number
}

export function PieceStand({ pieces, isOpponent = false, pieceSize = 32, label, width }: PieceStandProps) {
  // 相手は右から左へ（row-reverse）、自分は左から右へ（row）
  const piecesDirection = isOpponent ? 'row-reverse' : 'row'
  // 相手はラベル左、自分はラベル右
  const containerDirection = isOpponent ? 'row' : 'row-reverse'

  return (
    <View style={[styles.container, { flexDirection: containerDirection }, width ? { width } : undefined]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[styles.piecesArea, { flexDirection: piecesDirection }]}>
        {HAND_PIECE_TYPES.map((pieceType) => {
          const count = pieces[pieceType] ?? 0
          if (count === 0) return null

          return (
            <View key={pieceType} style={styles.pieceWrapper}>
              <Piece type={pieceType} isOpponent={isOpponent} size={pieceSize} />
              {count > 1 && (
                <Text style={styles.count}>{count}</Text>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE0D0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4C4B0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 44,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
    marginHorizontal: 8,
  },
  piecesArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieceWrapper: {
    position: 'relative',
    marginHorizontal: 2,
  },
  count: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    fontSize: 11,
    fontWeight: 'normal',
    color: '#666',
    backgroundColor: '#FFF',
    borderRadius: 6,
    minWidth: 14,
    textAlign: 'center',
    overflow: 'hidden',
  },
})
