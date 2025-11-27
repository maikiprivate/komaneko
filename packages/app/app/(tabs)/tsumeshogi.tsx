import { StyleSheet, View, Text, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { PieceStand } from '@/components/shogi/PieceStand'
import { createInitialBoard } from '@/lib/shogi/sfen'
import type { CapturedPieces } from '@/lib/shogi/types'

// テスト用の持ち駒データ（最大ケース）
const testSenteHand: CapturedPieces = { hi: 2, kaku: 2, kin: 4, gin: 4, kei: 4, kyo: 4, fu: 18 }
const testGoteHand: CapturedPieces = { hi: 2, kaku: 2, kin: 4, gin: 4, kei: 4, kyo: 4, fu: 18 }

export default function TsumeshogiScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const { board } = createInitialBoard()

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 48) / 9)
  // 盤面エリアの幅（cellSize * 9 + padding + border + 段番号の幅）
  const boardWidth = cellSize * 9 + 8 + 12

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={[]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          詰将棋
        </Text>
        <PieceStand pieces={testGoteHand} isOpponent label="後手" width={boardWidth} />
        <ShogiBoard board={board} player="sente" cellSize={cellSize} />
        <PieceStand pieces={testSenteHand} label="先手" width={boardWidth} />
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
