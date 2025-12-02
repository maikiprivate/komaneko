/**
 * 将棋盤コンポーネント
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'

import Colors from '@/constants/Colors'
import type { Board, Perspective, Position } from '../../lib/shogi/types'
import {
  transformBoardForPerspective,
  getFileLabels,
  getRankLabels,
} from '../../lib/shogi/perspective'
import { Piece } from './Piece'

/** 将棋盤の木目色（UIローカル定数） */
const BOARD_COLORS = {
  background: '#E8C98E',
  border: '#CD853F',
  cellBorder: '#A0826D',
  star: '#5D4037',
  label: '#8B7355',
} as const

/** 最後に指された手（ハイライト用） */
interface LastMoveHighlight {
  from?: Position
  to: Position
}

interface ShogiBoardProps {
  board: Board
  perspective: Perspective
  cellSize?: number
  /** セルタップ時のコールバック（row, colは元の盤面座標） */
  onCellPress?: (row: number, col: number) => void
  /** 選択中のマス（元の盤面座標） */
  selectedPosition?: Position | null
  /** 移動可能なマス一覧（元の盤面座標） */
  possibleMoves?: Position[]
  /** 最後に指された手（ハイライト用） */
  lastMove?: LastMoveHighlight | null
}

// 星の位置（罫線の交点）
// 将棋の座標: 3三、6三、3六、6六
// マスの右下角に配置（先手視点の場合）
const STAR_POSITIONS_SENTE = [
  { row: 2, col: 2 },  // 6三
  { row: 2, col: 5 },  // 3三
  { row: 5, col: 2 },  // 6六
  { row: 5, col: 5 },  // 3六
]

// 後手視点の場合（180度回転）
const STAR_POSITIONS_GOTE = [
  { row: 3, col: 3 },  // 6六 → 変換後
  { row: 3, col: 6 },  // 3六 → 変換後
  { row: 6, col: 3 },  // 6三 → 変換後
  { row: 6, col: 6 },  // 3三 → 変換後
]

function hasStarAtBottomRight(row: number, col: number, perspective: Perspective): boolean {
  const positions = perspective === 'sente' ? STAR_POSITIONS_SENTE : STAR_POSITIONS_GOTE
  return positions.some((pos) => pos.row === row && pos.col === col)
}

export function ShogiBoard({
  board,
  perspective,
  cellSize = 36,
  onCellPress,
  selectedPosition,
  possibleMoves = [],
  lastMove,
}: ShogiBoardProps) {
  const labelSize = 12
  const transformedBoard = transformBoardForPerspective(board, perspective)
  const fileLabels = getFileLabels(perspective)
  const rankLabels = getRankLabels(perspective)

  // 表示座標から元の盤面座標に変換
  const toOriginalCoord = (displayRow: number, displayCol: number): { row: number; col: number } => {
    if (perspective === 'gote') {
      return { row: 8 - displayRow, col: 8 - displayCol }
    }
    return { row: displayRow, col: displayCol }
  }

  // 元の盤面座標が選択中かどうか
  const isSelected = (displayRow: number, displayCol: number): boolean => {
    if (!selectedPosition) return false
    const orig = toOriginalCoord(displayRow, displayCol)
    return orig.row === selectedPosition.row && orig.col === selectedPosition.col
  }

  // 元の盤面座標が移動可能かどうか
  const isPossibleMove = (displayRow: number, displayCol: number): boolean => {
    const orig = toOriginalCoord(displayRow, displayCol)
    return possibleMoves.some((p) => p.row === orig.row && p.col === orig.col)
  }

  // 最後に指された手のハイライト（移動元）
  const isLastMoveFrom = (displayRow: number, displayCol: number): boolean => {
    if (!lastMove?.from) return false
    const orig = toOriginalCoord(displayRow, displayCol)
    return orig.row === lastMove.from.row && orig.col === lastMove.from.col
  }

  // 最後に指された手のハイライト（移動先）
  const isLastMoveTo = (displayRow: number, displayCol: number): boolean => {
    if (!lastMove) return false
    const orig = toOriginalCoord(displayRow, displayCol)
    return orig.row === lastMove.to.row && orig.col === lastMove.to.col
  }

  const handleCellPress = (displayRow: number, displayCol: number) => {
    if (!onCellPress) return
    const orig = toOriginalCoord(displayRow, displayCol)
    onCellPress(orig.row, orig.col)
  }

  return (
    <View style={styles.board}>
      {/* 筋の番号（上部） */}
      <View style={[styles.row, { height: labelSize }]}>
        {fileLabels.map((label, index) => (
          <Text key={index} style={[styles.label, { width: cellSize, height: labelSize, lineHeight: labelSize }]}>
            {label}
          </Text>
        ))}
        <View style={{ width: labelSize }} />
      </View>

      {/* 盤面 + 段の番号 */}
      {transformedBoard.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((piece, colIndex) => {
            const selected = isSelected(rowIndex, colIndex)
            const possible = isPossibleMove(rowIndex, colIndex)
            const lastFrom = isLastMoveFrom(rowIndex, colIndex)
            const lastTo = isLastMoveTo(rowIndex, colIndex)

            return (
              <TouchableOpacity
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize },
                  lastFrom && styles.lastMoveFromCell,
                  lastTo && styles.lastMoveToCell,
                  selected && styles.selectedCell,
                  possible && styles.possibleCell,
                ]}
                onPress={() => handleCellPress(rowIndex, colIndex)}
                activeOpacity={0.7}
              >
                {piece && (
                  <Piece
                    type={piece.type}
                    isOpponent={piece.owner !== perspective}
                    size={cellSize - 4}
                  />
                )}
                {hasStarAtBottomRight(rowIndex, colIndex, perspective) && (
                  <View style={styles.star} />
                )}
              </TouchableOpacity>
            )
          })}
          {/* 段の番号（右側） */}
          <Text style={[styles.label, styles.rankLabel, { width: labelSize, height: cellSize, lineHeight: cellSize }]}>
            {rankLabels[rowIndex]}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: BOARD_COLORS.background,
    padding: 2,
    borderWidth: 2,
    borderColor: BOARD_COLORS.border,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 10,
    color: BOARD_COLORS.label,
    textAlign: 'center',
  },
  rankLabel: {
    paddingLeft: 2,
  },
  cell: {
    borderWidth: 0.5,
    borderColor: BOARD_COLORS.cellBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCell: {
    backgroundColor: Colors.palette.shogiSelected,
  },
  possibleCell: {
    backgroundColor: Colors.palette.greenLight,
  },
  lastMoveFromCell: {
    backgroundColor: '#FFE4B5',  // 薄いオレンジ（移動元）
  },
  lastMoveToCell: {
    backgroundColor: '#FFDAB9',  // 少し濃いオレンジ（移動先）
  },
  star: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BOARD_COLORS.star,
    zIndex: 10,
  },
})
