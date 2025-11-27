import { StyleSheet, View, Text, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { PieceStand } from '@/components/shogi/PieceStand'
import { parseSfen } from '@/lib/shogi/sfen'
import type { Perspective } from '@/lib/shogi/types'

// テスト用の詰将棋問題（1手詰め）
// 後手玉: 1一、先手金: 2二、先手持ち駒: 飛
// 答え: ▲1二飛
const TEST_TSUMESHOGI_SFEN = '8k/7G1/9/9/9/9/9/9/9 b R 1'

export default function TsumeshogiScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()

  // 詰将棋データを解析
  const { board, capturedPieces } = parseSfen(TEST_TSUMESHOGI_SFEN)

  // 視点（テスト用に切り替え可能）
  const perspective: Perspective = 'sente'

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 48) / 9)
  // 盤面エリアの幅（cellSize * 9 + padding + border + 段番号の幅）
  const boardWidth = cellSize * 9 + 8 + 12

  // 視点に応じた駒台の順序
  const topStand = perspective === 'sente'
    ? { pieces: capturedPieces.gote, label: '後手', isOpponent: true }
    : { pieces: capturedPieces.sente, label: '先手', isOpponent: true }
  const bottomStand = perspective === 'sente'
    ? { pieces: capturedPieces.sente, label: '先手', isOpponent: false }
    : { pieces: capturedPieces.gote, label: '後手', isOpponent: false }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={[]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          詰将棋
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
