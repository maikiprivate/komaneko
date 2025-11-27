/**
 * 将棋盤コンポーネント
 */

import { StyleSheet, View, Text } from 'react-native'

import type { Board, Perspective } from '../../lib/shogi/types'
import {
  transformBoardForPerspective,
  getFileLabels,
  getRankLabels,
} from '../../lib/shogi/perspective'
import { Piece } from './Piece'

interface ShogiBoardProps {
  board: Board
  perspective: Perspective
  cellSize?: number
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

export function ShogiBoard({ board, perspective, cellSize = 36 }: ShogiBoardProps) {
  const labelSize = 12
  const transformedBoard = transformBoardForPerspective(board, perspective)
  const fileLabels = getFileLabels(perspective)
  const rankLabels = getRankLabels(perspective)

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
          {row.map((piece, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}`}
              style={[styles.cell, { width: cellSize, height: cellSize }]}
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
            </View>
          ))}
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
    backgroundColor: '#E8C98E',
    padding: 2,
    borderWidth: 2,
    borderColor: '#CD853F',
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 10,
    color: '#8B7355',
    textAlign: 'center',
  },
  rankLabel: {
    paddingLeft: 2,
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#A0826D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5D4037',
    zIndex: 10,
  },
})
