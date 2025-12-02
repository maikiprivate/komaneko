import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { PieceStand } from '@/components/shogi/PieceStand'
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

export default function TsumeshogiPlayScreen() {
  const { colors, palette } = useTheme()
  const { width } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  // IDから問題を取得
  const problem = MOCK_TSUMESHOGI_PROBLEMS.find((p) => p.id === id)

  if (!problem) {
    return null
  }

  // ヘッダータイトル用の情報
  const movesLabel = MOVES_LABELS[problem.moves as MovesOption]
  const problemNumber = getProblemNumber(problem.id, problem.moves)
  const headerTitle = `${movesLabel} 問題${problemNumber}`

  // 次の問題
  const { nextId } = getAdjacentProblemIds(problem.id, problem.moves)

  // 正解状態
  const [isSolved, setIsSolved] = useState(false)

  // フィードバック状態
  type FeedbackType = 'none' | 'correct' | 'incorrect'
  const [feedback, setFeedback] = useState<FeedbackType>('none')

  // アニメーション用
  const scaleAnim = useRef(new Animated.Value(1)).current
  const feedbackOpacity = useRef(new Animated.Value(0)).current
  const feedbackScale = useRef(new Animated.Value(0.5)).current

  // フィードバック表示関数
  const showFeedback = (type: 'correct' | 'incorrect') => {
    setFeedback(type)
    feedbackOpacity.setValue(0)
    feedbackScale.setValue(0.5)

    // 表示アニメーション
    Animated.parallel([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(feedbackScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start()

    // 1.5秒後に非表示
    setTimeout(() => {
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setFeedback('none')
        if (type === 'correct') {
          setIsSolved(true)
        }
      })
    }, 1500)
  }

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

  // ゲームフックを使用
  const game = useTsumeshogiGame(problem, {
    onCorrect: () => showFeedback('correct'),
    onIncorrect: () => showFeedback('incorrect'),
  })

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
      <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
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
            />
            <PieceStand
              pieces={bottomStand.pieces}
              isOpponent={bottomStand.isOpponent}
              label={bottomStand.label}
              width={boardWidth}
              onPiecePress={game.handleCapturedPress}
              selectedPiece={game.selectedCaptured}
            />
          </View>

          {/* フィードバックオーバーレイ（将棋盤エリア基準） */}
          {feedback !== 'none' && (
            <Animated.View style={[styles.feedbackOverlay, { opacity: feedbackOpacity }]}>
              <Animated.Text
                style={[
                  styles.feedbackSymbol,
                  {
                    color:
                      feedback === 'correct'
                        ? palette.correctFeedback
                        : colors.gamification.error,
                    transform: [{ scale: feedbackScale }],
                  },
                ]}
              >
                {feedback === 'correct' ? '○' : '×'}
              </Animated.Text>
            </Animated.View>
          )}

          {/* 成り選択ダイアログ */}
          {game.pendingPromotion && (
            <View style={styles.promotionOverlay}>
              <View style={[styles.promotionDialog, { backgroundColor: colors.background.primary }]}>
                <Text style={[styles.promotionTitle, { color: colors.text.primary }]}>
                  成りますか？
                </Text>
                <View style={styles.promotionButtons}>
                  <TouchableOpacity
                    style={[styles.promotionButton, { backgroundColor: palette.orange }]}
                    onPress={() => game.handlePromotionSelect(true)}
                  >
                    <Text style={[styles.promotionButtonText, { color: palette.white }]}>成る</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.promotionButton, { backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => game.handlePromotionSelect(false)}
                  >
                    <Text style={[styles.promotionButtonText, { color: colors.text.primary }]}>不成</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
        <View style={styles.progressArea}>
          <Text style={[styles.progressText, { color: colors.text.secondary }]}>
            {game.currentMoveCount}手目 / {problem.moves}手詰め
          </Text>
        </View>
        <View style={styles.navigationArea}>
          <TouchableOpacity
            onPress={() => isSolved && nextId && router.replace(`/tsumeshogi/${nextId}`)}
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
        <View style={[styles.footer, { backgroundColor: colors.background.primary, borderTopColor: palette.orange }]}>
          <TouchableOpacity style={styles.actionButton} onPress={game.reset}>
            <FontAwesome name="refresh" size={20} color={colors.gamification.success} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>やり直し</Text>
          </TouchableOpacity>
          <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.actionButton} onPress={() => console.log('ヒント')}>
            <FontAwesome name="lightbulb-o" size={20} color={palette.orange} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>ヒント</Text>
          </TouchableOpacity>
          <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.actionButton} onPress={() => console.log('解答')}>
            <FontAwesome name="key" size={20} color={colors.gamification.heart} />
            <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>解答</Text>
          </TouchableOpacity>
        </View>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerDivider: {
    width: 1,
    height: 32,
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
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  feedbackSymbol: {
    fontSize: 280,
    fontWeight: 'bold',
  },
  promotionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 200,
  },
  promotionDialog: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  promotionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  promotionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  promotionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    // Note: デフォルトは白（成るボタン用）、不成ボタンではインラインで上書き
  },
})
