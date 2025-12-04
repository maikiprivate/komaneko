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
  /** ヒント表示中の駒 */
  hintPiece?: string | null
}

// 駒台の高さを計算（駒の有無に関わらず一定）
// pieceSize + pieceWrapper padding(4) + container paddingVertical(8) + border(2)
const PIECE_STAND_PADDING = 14

export function PieceStand({
  pieces,
  isOpponent = false,
  pieceSize = 32,
  label,
  width,
  onPiecePress,
  selectedPiece,
  hintPiece,
}: PieceStandProps) {
  // 相手は右から左へ（row-reverse）、自分は左から右へ（row）
  const piecesDirection = isOpponent ? 'row-reverse' : 'row'
  // 相手はラベル左、自分はラベル右
  const containerDirection = isOpponent ? 'row' : 'row-reverse'

  // タップ可能かどうか（相手の駒台はタップ不可）
  const isTappable = !isOpponent && !!onPiecePress

  // 駒台の高さ（駒の有無に関わらず一定）
  const standHeight = pieceSize + PIECE_STAND_PADDING

  return (
    <View style={[styles.container, { flexDirection: containerDirection, height: standHeight }, width ? { width } : undefined]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[styles.piecesArea, { flexDirection: piecesDirection }]}>
        {HAND_PIECE_TYPES.map((pieceType) => {
          const count = pieces[pieceType] ?? 0
          if (count === 0) return null

          const isSelected = selectedPiece === pieceType
          const isHint = hintPiece === pieceType

          return (
            <TouchableOpacity
              key={pieceType}
              style={[styles.pieceWrapper, isHint && styles.hintPiece, isSelected && styles.selectedPiece]}
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
    backgroundColor: '#D6B891',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#B8956E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    // height is set dynamically based on pieceSize
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D4C41',
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
  hintPiece: {
    backgroundColor: '#FF9800',  // オレンジ（ヒント）
  },
  count: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5D4037',
    backgroundColor: '#FFF8E1',
    borderRadius: 6,
    minWidth: 14,
    textAlign: 'center',
    overflow: 'hidden',
  },
})
