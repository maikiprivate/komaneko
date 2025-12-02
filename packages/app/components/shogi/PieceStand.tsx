/**
 * 駒台コンポーネント（持ち駒表示）
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'

import Colors from '@/constants/Colors'
import type { CapturedPieces, PieceType } from '../../lib/shogi/types'
import { HAND_PIECE_TYPES } from '../../lib/shogi/types'
import { Piece } from './Piece'

interface PieceStandProps {
  pieces: CapturedPieces
  isOpponent?: boolean
  pieceSize?: number
  label?: string
  width?: number
  /** 持ち駒タップ時のコールバック */
  onPiecePress?: (pieceType: PieceType) => void
  /** 選択中の駒 */
  selectedPiece?: PieceType | null
}

export function PieceStand({
  pieces,
  isOpponent = false,
  pieceSize = 32,
  label,
  width,
  onPiecePress,
  selectedPiece,
}: PieceStandProps) {
  // 相手は右から左へ（row-reverse）、自分は左から右へ（row）
  const piecesDirection = isOpponent ? 'row-reverse' : 'row'
  // 相手はラベル左、自分はラベル右
  const containerDirection = isOpponent ? 'row' : 'row-reverse'

  // タップ可能かどうか（相手の駒台はタップ不可）
  const isTappable = !isOpponent && !!onPiecePress

  return (
    <View style={[styles.container, { flexDirection: containerDirection }, width ? { width } : undefined]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[styles.piecesArea, { flexDirection: piecesDirection }]}>
        {HAND_PIECE_TYPES.map((pieceType) => {
          const count = pieces[pieceType] ?? 0
          if (count === 0) return null

          const isSelected = selectedPiece === pieceType

          return (
            <TouchableOpacity
              key={pieceType}
              style={[styles.pieceWrapper, isSelected && styles.selectedPiece]}
              onPress={() => isTappable && onPiecePress(pieceType)}
              disabled={!isTappable}
              activeOpacity={isTappable ? 0.7 : 1}
            >
              <Piece type={pieceType} isOpponent={isOpponent} size={pieceSize} />
              {count > 1 && (
                <Text style={styles.count}>{count}</Text>
              )}
            </TouchableOpacity>
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
    borderRadius: 4,
    padding: 2,
  },
  selectedPiece: {
    backgroundColor: Colors.palette.shogiSelected,
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
