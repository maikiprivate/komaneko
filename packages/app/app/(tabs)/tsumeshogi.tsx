import { StyleSheet, View, Text, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '@/components/useTheme'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { createInitialBoard } from '@/lib/shogi/sfen'

export default function TsumeshogiScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const { board } = createInitialBoard()

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 32) / 9)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={[]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          詰将棋
        </Text>
        <ShogiBoard board={board} player="sente" cellSize={cellSize} />
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
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
})
