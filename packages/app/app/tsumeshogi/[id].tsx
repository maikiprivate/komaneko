import { Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { PieceStand } from '@/components/shogi/PieceStand'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { useTheme } from '@/components/useTheme'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import { parseSfen } from '@/lib/shogi/sfen'
import type { Perspective } from '@/lib/shogi/types'
import { MOCK_TSUMESHOGI_PROBLEMS, MOVES_LABELS, type MovesOption } from '@/mocks/tsumeshogiData'

/** 同じ手数の問題内での番号を取得 */
function getProblemNumber(problemId: string, moves: number): number {
  const sameMovesProblems = MOCK_TSUMESHOGI_PROBLEMS.filter((p) => p.moves === moves)
  const index = sameMovesProblems.findIndex((p) => p.id === problemId)
  return index + 1
}

export default function TsumeshogiPlayScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()

  // IDから問題を取得
  const problem = MOCK_TSUMESHOGI_PROBLEMS.find((p) => p.id === id)

  if (!problem) {
    return null
  }

  // ヘッダータイトル用の情報
  const movesLabel = MOVES_LABELS[problem.moves as MovesOption]
  const problemNumber = getProblemNumber(problem.id, problem.moves)
  const headerTitle = `${movesLabel} 問題${problemNumber}`

  // 進行状況（後でstateに置き換え）
  const currentMove = 1

  // SFENをパース
  const { board, capturedPieces } = parseSfen(problem.sfen)

  // 視点（詰将棋は常に先手視点）
  const perspective: Perspective = 'sente'

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 48) / 9)
  const boardWidth = cellSize * 9 + 8 + 12

  // 視点に応じた駒台の順序
  const { top: topStand, bottom: bottomStand } = getPieceStandOrder(
    capturedPieces.sente,
    capturedPieces.gote,
    perspective,
  )

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background.secondary }]}
        edges={['bottom']}
      >
        <View style={styles.commentArea}>
          <KomanekoComment message="王手の連続で玉を詰ませるにゃ！持ち駒を上手く使ってにゃ〜" />
        </View>
        <View style={styles.content}>
          <PieceStand
            pieces={topStand.pieces}
            isOpponent={topStand.isOpponent}
            label={topStand.label}
            width={boardWidth}
          />
          <ShogiBoard board={board} perspective={perspective} cellSize={cellSize} />
          <PieceStand
            pieces={bottomStand.pieces}
            isOpponent={bottomStand.isOpponent}
            label={bottomStand.label}
            width={boardWidth}
          />
        </View>
        <View style={styles.progressArea}>
          <Text style={[styles.progressText, { color: colors.text.secondary }]}>
            {currentMove}手目 / {problem.moves}手詰め
          </Text>
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commentArea: {
    paddingVertical: 12,
  },
  content: {
    alignItems: 'center',
    gap: 4,
  },
  progressArea: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
