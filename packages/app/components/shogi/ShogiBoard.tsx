/**
 * 将棋盤コンポーネント
 */

import { StyleSheet, View } from 'react-native'

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

function hasStarAtBottomRight(row: number, col: number): boolean {
  return STAR_POSITIONS.some((pos) => pos.row === row && pos.col === col)
}

export function ShogiBoard({ board, player, cellSize = 36 }: ShogiBoardProps) {
  return (
    <View style={styles.board}>
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
