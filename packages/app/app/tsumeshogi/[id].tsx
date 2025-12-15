import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { useHeartsGate } from '@/lib/hearts/useHeartsGate'
import { recordLearningCompletion } from '@/lib/streak/recordLearningCompletion'
import { FeedbackOverlay } from '@/components/shogi/FeedbackOverlay'
import { GameFooter } from '@/components/shogi/GameFooter'
import { PieceStand } from '@/components/shogi/PieceStand'
import { PromotionDialog } from '@/components/shogi/PromotionDialog'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { useTheme } from '@/components/useTheme'
import { useTsumeshogiGame } from '@/hooks/useTsumeshogiGame'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import type { Perspective } from '@/lib/shogi/types'
import { MOCK_TSUMESHOGI_PROBLEMS, MOVES_LABELS, type MovesOption } from '@/mocks/tsumeshogiData'

/** 同じ手数の問題内での番号を取得 */
function getProblemNumber(problemId: string, moves: number): number {
  const sameMovesProblems = MOCK_TSUMESHOGI_PROBLEMS.filter((p) => p.moves === moves)
  const index = sameMovesProblems.findIndex((p) => p.id === problemId)
  return index + 1
}

/** 同じ手数の問題リスト内での前後の問題IDを取得 */
function getAdjacentProblemIds(
  problemId: string,
  moves: number,
): { prevId: string | null; nextId: string | null } {
  const sameMovesProblems = MOCK_TSUMESHOGI_PROBLEMS.filter((p) => p.moves === moves)
  const currentIndex = sameMovesProblems.findIndex((p) => p.id === problemId)

  const prevId = currentIndex > 0 ? sameMovesProblems[currentIndex - 1].id : null
  const nextId =
    currentIndex < sameMovesProblems.length - 1 ? sameMovesProblems[currentIndex + 1].id : null

  return { prevId, nextId }
}

// 消費ハート数（将来的にはproblem.heartCostから取得）
const HEART_COST = 1

export default function TsumeshogiPlayScreen() {
  const { colors, palette } = useTheme()
  const { width } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  // IDから問題を取得
  const problem = MOCK_TSUMESHOGI_PROBLEMS.find((p) => p.id === id)

  // ハート管理（開始時チェック + 完了時消費）
  const heartsGate = useHeartsGate({ heartCost: HEART_COST })

  // 正解状態
  const [isSolved, setIsSolved] = useState(false)

  // フィードバック状態
  type FeedbackType = 'none' | 'correct' | 'incorrect'
  const [feedback, setFeedback] = useState<FeedbackType>('none')

  // アニメーション用
  const scaleAnim = useRef(new Animated.Value(1)).current

  // フィードバック完了時の処理
  const handleFeedbackComplete = useCallback(() => {
    if (feedback === 'correct') {
      setIsSolved(true)
    }
    setFeedback('none')
  }, [feedback])

  // 正解時のハート消費（useTsumeshogiGameに渡す）
  const handleCorrect = useCallback(async (): Promise<boolean> => {
    setFeedback('correct')
    // ハート消費（成功時のみ完了扱い）
    return heartsGate.consumeOnComplete()
  }, [heartsGate])

  // ゲームフックを使用（Hooks呼び出しは条件分岐の前に行う）
  const game = useTsumeshogiGame(problem, {
    onCorrect: handleCorrect,
    onIncorrect: () => setFeedback('incorrect'),
    onNotCheck: () => Alert.alert('王手ではありません', '詰将棋では王手の連続で詰ませる必要があります'),
  })

  // 正解時の「次の問題へ」ボタンアニメーション
  useEffect(() => {
    if (isSolved) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isSolved, scaleAnim])

  // 正解時のストリーク更新チェック
  useEffect(() => {
    if (isSolved) {
      const checkStreak = async () => {
        try {
          const result = await recordLearningCompletion()
          if (result.updated) {
            router.push(`/streak-update?count=${result.newCount}`)
          }
        } catch (error) {
          console.error('[Tsumeshogi] Failed to check streak:', error)
        }
      }
      checkStreak()
    }
  }, [isSolved])

  // ローディング中
  if (heartsGate.isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: palette.gameBackground }]}>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>読み込み中...</Text>
      </View>
    )
  }

  // エラー発生時
  if (heartsGate.error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: palette.gameBackground }]}>
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          データの取得に失敗しました
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: palette.orange }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.retryButtonText, { color: palette.white }]}>戻る</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // 問題が見つからない場合
  if (!game.isReady || !problem) {
    return null
  }

  // ここ以降、problemは必ず存在する

  // ヘッダータイトル用の情報
  const movesLabel = MOVES_LABELS[problem.moves as MovesOption]
  const problemNumber = getProblemNumber(problem.id, problem.moves)
  const headerTitle = `${movesLabel} 問題${problemNumber}`

  // 次の問題
  const { nextId } = getAdjacentProblemIds(problem.id, problem.moves)

  // 視点（詰将棋は常に先手視点）
  const perspective: Perspective = 'sente'

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 48) / 9)
  const boardWidth = cellSize * 9 + 8 + 12

  // 視点に応じた駒台の順序
  const { top: topStand, bottom: bottomStand } = getPieceStandOrder(
    game.boardState.capturedPieces.sente,
    game.boardState.capturedPieces.gote,
    perspective,
  )

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <View style={[styles.container, { backgroundColor: palette.gameBackground }]}>
        <View style={styles.commentArea}>
          <KomanekoComment message="王手の連続で玉を詰ませるにゃ！持ち駒を上手く使ってにゃ〜" />
        </View>
        <View style={styles.boardSection}>
          <View style={styles.content}>
            <PieceStand
              pieces={topStand.pieces}
              isOpponent={topStand.isOpponent}
              label={topStand.label}
              width={boardWidth}
            />
            <ShogiBoard
              board={game.boardState.board}
              perspective={perspective}
              cellSize={cellSize}
              onCellPress={game.handleCellPress}
              selectedPosition={game.selectedPosition}
              possibleMoves={game.possibleMoves}
              lastMove={game.lastMove}
              hintHighlight={game.hintHighlight}
            />
            <PieceStand
              pieces={bottomStand.pieces}
              isOpponent={bottomStand.isOpponent}
              label={bottomStand.label}
              width={boardWidth}
              onPiecePress={game.handleCapturedPress}
              selectedPiece={game.selectedCaptured}
              hintPiece={game.hintHighlight?.piece}
            />
          </View>

          {/* フィードバックオーバーレイ */}
          <FeedbackOverlay type={feedback} onComplete={handleFeedbackComplete} />

          {/* 成り選択ダイアログ */}
          <PromotionDialog
            visible={!!game.pendingPromotion}
            onSelect={game.handlePromotionSelect}
          />
        </View>
        <View style={styles.progressArea}>
          <Text
            style={[
              styles.progressText,
              { color: game.isSolutionMode ? palette.orange : colors.text.secondary },
            ]}
          >
            {game.isSolutionMode
              ? '解答再生中...'
              : `${game.currentMoveCount}手目 / ${problem.moves}手詰め`}
          </Text>
        </View>
        <View style={styles.navigationArea}>
          <TouchableOpacity
            onPress={() => {
              if (!isSolved || !nextId) return
              // 次の問題に遷移する前にハートをチェック
              if (!heartsGate.checkAvailable()) return
              router.replace(`/tsumeshogi/${nextId}`)
            }}
            disabled={!isSolved || !nextId}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.navButton,
                {
                  transform: [{ scale: scaleAnim }],
                  backgroundColor: isSolved ? colors.gamification.success : colors.background.secondary,
                  borderColor: isSolved ? colors.gamification.success : colors.border,
                  opacity: isSolved ? 1 : 0.6,
                },
              ]}
            >
              <Text
                style={[
                  styles.navButtonText,
                  { color: isSolved ? palette.white : colors.text.secondary },
                ]}
              >
                次の問題へ
              </Text>
              <FontAwesome
                name="chevron-right"
                size={14}
                color={isSolved ? palette.white : colors.text.secondary}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
        <View style={styles.spacer} />
        <GameFooter
          onReset={game.reset}
          onHint={game.showHint}
          onSolution={game.playSolution}
        />
        <View style={[styles.homeIndicatorArea, { backgroundColor: colors.background.primary, height: insets.bottom }]} />
      </View>
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
  boardSection: {
    position: 'relative',
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
  spacer: {
    flex: 1,
  },
  homeIndicatorArea: {
    // height is set dynamically using insets.bottom
  },
  navigationArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
