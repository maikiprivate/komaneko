import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { useHeartsGate } from '@/lib/hearts/useHeartsGate'
import { recordLearningCompletion } from '@/lib/streak/recordLearningCompletion'
import { FeedbackOverlay } from '@/components/shogi/FeedbackOverlay'
import { PieceStand } from '@/components/shogi/PieceStand'
import { PromotionDialog } from '@/components/shogi/PromotionDialog'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { useTheme } from '@/components/useTheme'
import { useTsumeshogiGame, type TsumeshogiProblemForGame } from '@/hooks/useTsumeshogiGame'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import type { Perspective } from '@/lib/shogi/types'
import { getTsumeshogi, getTsumeshogiList, type TsumeshogiProblem } from '@/lib/api/tsumeshogi'

/** 手数の表示名 */
const MOVES_LABELS: Record<number, string> = {
  3: '3手詰め',
  5: '5手詰め',
  7: '7手詰め',
}

// 消費ハート数（将来的にはproblem.heartCostから取得）
const HEART_COST = 1

export default function TsumeshogiPlayScreen() {
  const { colors, palette } = useTheme()
  const { width } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  // API からデータを取得
  const [problem, setProblem] = useState<TsumeshogiProblem | null>(null)
  const [problemsInSameMoves, setProblemsInSameMoves] = useState<TsumeshogiProblem[]>([])
  const [isLoadingProblem, setIsLoadingProblem] = useState(true)
  const [problemError, setProblemError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // エラー時のリトライ
  const handleRetry = useCallback(() => {
    setProblemError(null)
    setRetryCount((prev) => prev + 1)
  }, [])

  // 問題を取得
  useEffect(() => {
    if (!id) return

    let cancelled = false
    setIsLoadingProblem(true)
    setProblemError(null)

    getTsumeshogi(id)
      .then((data) => {
        if (cancelled) return
        setProblem(data)
        // 同じ手数の問題一覧も取得（次の問題への遷移用）
        return getTsumeshogiList(data.moveCount)
      })
      .then((list) => {
        if (cancelled || !list) return
        setProblemsInSameMoves(list)
      })
      .catch((err) => {
        if (cancelled) return
        setProblemError(err.message || 'データの取得に失敗しました')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProblem(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, retryCount])

  // ゲーム用の問題データに変換
  const problemForGame: TsumeshogiProblemForGame | undefined = problem
    ? { sfen: problem.sfen, moves: problem.moveCount }
    : undefined

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

  /**
   * 正解時のハート消費（useTsumeshogiGameに渡す）
   *
   * ハート消費パターン:
   * - 詰将棋: 正解時に消費 + 次の問題へ遷移前にcheckAvailable()
   * - レッスン: 最終問題完了時にonComplete()で消費（自動進行のため事前チェック不要）
   */
  const handleCorrect = useCallback(async (): Promise<boolean> => {
    setFeedback('correct')
    return heartsGate.consumeOnComplete()
  }, [heartsGate])

  // ゲームフックを使用（Hooks呼び出しは条件分岐の前に行う）
  const game = useTsumeshogiGame(problemForGame, {
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

  // ヘッダータイトル用の情報（メモ化）※フックは早期リターンの前に呼ぶ
  const { headerTitle, nextId } = useMemo(() => {
    if (!problem) {
      return { headerTitle: '', nextId: null }
    }
    const movesLabel = MOVES_LABELS[problem.moveCount] || `${problem.moveCount}手詰め`
    const currentIndex = problemsInSameMoves.findIndex((p) => p.id === problem.id)
    const problemNumber = currentIndex + 1
    return {
      headerTitle: `${movesLabel} 問題${problemNumber}`,
      nextId: problemsInSameMoves[currentIndex + 1]?.id ?? null,
    }
  }, [problem, problemsInSameMoves])

  // ローディング中
  if (heartsGate.isLoading || isLoadingProblem) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: palette.gameBackground }]}>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>読み込み中...</Text>
      </View>
    )
  }

  // エラー発生時
  if (heartsGate.error || problemError) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: palette.gameBackground }]}>
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          {problemError || 'データの取得に失敗しました'}
        </Text>
        <View style={styles.errorButtons}>
          {problemError && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: palette.orange }]}
              onPress={handleRetry}
            >
              <Text style={[styles.retryButtonText, { color: palette.white }]}>再試行</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.backButton, { borderColor: palette.orange }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: palette.orange }]}>戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // 問題が見つからない場合
  if (!game.isReady || !problem) {
    return null
  }

  // ここ以降、problemは必ず存在する

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
          <Text style={[styles.progressText, { color: colors.text.secondary }]}>
            {`${game.currentMoveCount}手目 / ${problem.moveCount}手詰め`}
          </Text>
        </View>
        <View style={styles.spacer} />
        <View style={styles.footerArea}>
          {isSolved ? (
            // 正解後: 次の問題へボタン
            <TouchableOpacity
              onPress={() => {
                if (!nextId) return
                // 次の問題に遷移する前にハートをチェック（手動遷移のため事前確認が必要）
                if (!heartsGate.checkAvailable()) return
                router.replace(`/tsumeshogi/${nextId}`)
              }}
              disabled={!nextId}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.footerButton,
                  {
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: colors.gamification.success,
                  },
                ]}
              >
                <Text style={[styles.footerButtonText, { color: palette.white }]}>
                  次の問題へ
                </Text>
                <FontAwesome name="chevron-right" size={14} color={palette.white} />
              </Animated.View>
            </TouchableOpacity>
          ) : (
            // 解答前: やり直しボタン
            <TouchableOpacity onPress={game.reset} activeOpacity={0.8}>
              <View
                style={[
                  styles.footerButton,
                  {
                    backgroundColor: colors.background.primary,
                    borderWidth: 1,
                    borderColor: palette.orange,
                  },
                ]}
              >
                <FontAwesome name="refresh" size={14} color={palette.orange} />
                <Text style={[styles.footerButtonText, { color: palette.orange }]}>
                  やり直し
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.homeIndicatorArea, { backgroundColor: palette.gameBackground, height: insets.bottom }]} />
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
  footerArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  footerButtonText: {
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
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
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
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
