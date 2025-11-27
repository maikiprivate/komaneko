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
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#DEB887',
    padding: 2,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
