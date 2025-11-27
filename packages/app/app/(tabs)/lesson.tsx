import { StyleSheet, View, Text, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { PieceStand } from '@/components/shogi/PieceStand'
import { createInitialBoard } from '@/lib/shogi/sfen'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import type { Perspective } from '@/lib/shogi/types'

export default function LessonScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()

  // 初期配置の盤面
  const { board, capturedPieces } = createInitialBoard()

  // 視点
  const perspective: Perspective = 'sente'

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 48) / 9)
  // 盤面エリアの幅（cellSize * 9 + padding + border + 段番号の幅）
  const boardWidth = cellSize * 9 + 8 + 12

  // 視点に応じた駒台の順序
  const { top: topStand, bottom: bottomStand } = getPieceStandOrder(
    capturedPieces.sente,
    capturedPieces.gote,
    perspective
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={[]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          駒塾
        </Text>
        <PieceStand pieces={topStand.pieces} isOpponent={topStand.isOpponent} label={topStand.label} width={boardWidth} />
        <ShogiBoard board={board} perspective={perspective} cellSize={cellSize} />
        <PieceStand pieces={bottomStand.pieces} isOpponent={bottomStand.isOpponent} label={bottomStand.label} width={boardWidth} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
})
