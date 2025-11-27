/**
 * 将棋盤コンポーネント
 */

import { StyleSheet, View, Text } from 'react-native'

import type { Board, Player } from '../../lib/shogi/types'
import { Piece } from './Piece'

interface ShogiBoardProps {
  board: Board
  player: Player
  cellSize?: number
}

// 星の位置（罫線の交点）
// 将棋の座標: 3三、6三、3六、6六
// マスの右下角に配置
const STAR_POSITIONS = [
  { row: 2, col: 2 },  // 6三
  { row: 2, col: 5 },  // 3三
  { row: 5, col: 2 },  // 6六
  { row: 5, col: 5 },  // 3六
]

// 筋の番号（右から左へ）
const FILE_LABELS = ['9', '8', '7', '6', '5', '4', '3', '2', '1']
// 段の番号（上から下へ）
const RANK_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

function hasStarAtBottomRight(row: number, col: number): boolean {
  return STAR_POSITIONS.some((pos) => pos.row === row && pos.col === col)
}

export function ShogiBoard({ board, player, cellSize = 36 }: ShogiBoardProps) {
  const labelSize = 12

  return (
    <View style={styles.board}>
      {/* 筋の番号（上部） */}
      <View style={[styles.row, { height: labelSize }]}>
        {FILE_LABELS.map((label, index) => (
          <Text key={index} style={[styles.label, { width: cellSize, height: labelSize, lineHeight: labelSize }]}>
            {label}
          </Text>
        ))}
        <View style={{ width: labelSize }} />
      </View>

      {/* 盤面 + 段の番号 */}
      {board.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((piece, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}`}
              style={[styles.cell, { width: cellSize, height: cellSize }]}
            >
              {piece && (
                <Piece
                  type={piece.type}
                  isOpponent={piece.owner !== player}
                  size={cellSize - 4}
                />
              )}
              {hasStarAtBottomRight(rowIndex, colIndex) && (
                <View style={styles.star} />
              )}
            </View>
          ))}
          {/* 段の番号（右側） */}
          <Text style={[styles.label, styles.rankLabel, { width: labelSize, height: cellSize, lineHeight: cellSize }]}>
            {RANK_LABELS[rowIndex]}
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
