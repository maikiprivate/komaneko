import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { FeedbackOverlay } from '@/components/shogi/FeedbackOverlay'
import { PieceStand } from '@/components/shogi/PieceStand'
import { PromotionDialog } from '@/components/shogi/PromotionDialog'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { useTheme } from '@/components/useTheme'
import { type TsumeshogiProblemForGame, useTsumeshogiGame } from '@/hooks/useTsumeshogiGame'
import { ApiError } from '@/lib/api/client'
import {
  type TsumeshogiProblem,
  getTsumeshogi,
  getTsumeshogiList,
  recordTsumeshogi,
} from '@/lib/api/tsumeshogi'
import { checkHeartsAvailable, hasEnoughHearts } from '@/lib/hearts/checkHeartsAvailable'
import { useHearts } from '@/lib/hearts/useHearts'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import type { Perspective } from '@/lib/shogi/types'
import { getTodayDateString, saveStreakFromApi } from '@/lib/streak/streakStorage'
import { saveStatusUpdate } from '@/lib/tsumeshogi/statusCache'

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
  const params = useLocalSearchParams<{
    id: string
    sfen?: string
    moveCount?: string
    status?: string
    problemIds?: string
    problemSfens?: string
    problemStatuses?: string
  }>()
  const { id } = params
  const insets = useSafeAreaInsets()

  // 一覧画面から渡されたキャッシュデータをパース
  const cachedData = useMemo(() => {
    if (!params.sfen || !params.moveCount) return null
    try {
      const moveCount = Number.parseInt(params.moveCount, 10)
      if (Number.isNaN(moveCount)) return null
      return {
        sfen: params.sfen,
        moveCount,
        problemIds: params.problemIds ? (JSON.parse(params.problemIds) as string[]) : null,
        problemSfens: params.problemSfens ? (JSON.parse(params.problemSfens) as string[]) : null,
        problemStatuses: params.problemStatuses
          ? (JSON.parse(params.problemStatuses) as string[])
          : null,
      }
    } catch {
      // パース失敗時はAPIから取得
      return null
    }
  }, [params.sfen, params.moveCount, params.problemIds, params.problemSfens, params.problemStatuses])

  // 問題データの状態
  const [problem, setProblem] = useState<TsumeshogiProblem | null>(null)
  const [problemIds, setProblemIds] = useState<string[] | null>(null)
  const [problemSfens, setProblemSfens] = useState<string[] | null>(null)
  const [problemStatuses, setProblemStatuses] = useState<string[] | null>(null)
  const [isLoadingProblem, setIsLoadingProblem] = useState(true)
  const [problemError, setProblemError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // エラー時のリトライ
  const handleRetry = useCallback(() => {
    setProblemError(null)
    setRetryCount((prev) => prev + 1)
  }, [])

  // 問題を取得（キャッシュがあればスキップ）
  useEffect(() => {
    if (!id) return

    // キャッシュデータがあればAPI呼び出しをスキップ
    if (cachedData) {
      setProblem({
        id,
        sfen: cachedData.sfen,
        moveCount: cachedData.moveCount,
        status: (params.status as TsumeshogiProblem['status']) ?? 'unsolved',
      })
      setProblemIds(cachedData.problemIds)
      setProblemSfens(cachedData.problemSfens)
      setProblemStatuses(cachedData.problemStatuses)
      setIsLoadingProblem(false)
      return
    }

    // キャッシュがなければAPIから取得（直接アクセス時）
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
        setProblemIds(list.map((p) => p.id))
        setProblemSfens(list.map((p) => p.sfen))
        setProblemStatuses(list.map((p) => p.status))
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
  }, [id, cachedData, retryCount])

  // ゲーム用の問題データに変換
  const problemForGame: TsumeshogiProblemForGame | undefined = problem
    ? { sfen: problem.sfen, moves: problem.moveCount }
    : undefined

  // ハート状態管理
  const {
    hearts,
    isLoading: heartsLoading,
    error: heartsError,
    updateFromConsumeResponse,
  } = useHearts()

  // 初回チェック済みフラグ（アラート・自動戻りは一度だけ）
  const hasCheckedHeartsRef = useRef(false)

  // 初回ロード完了時にハートチェック
  useEffect(() => {
    if (heartsLoading || hasCheckedHeartsRef.current) return
    hasCheckedHeartsRef.current = true

    if (heartsError) return

    // ハートが足りない場合はアラート表示して戻る
    if (!hasEnoughHearts(hearts, HEART_COST)) {
      checkHeartsAvailable(hearts, HEART_COST)
      router.back()
    }
  }, [heartsLoading, heartsError, hearts])

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
   * 正解時の処理（useTsumeshogiGameに渡す）
   *
   * 新API: POST /api/tsumeshogi/record
   * - 学習記録作成
   * - ハート消費（正解時のみ）
   * - ストリーク更新
   */
  const handleCorrect = useCallback(async (): Promise<boolean> => {
    if (!problem) return false
    setFeedback('correct')

    try {
      const result = await recordTsumeshogi({
        tsumeshogiId: problem.id,
        isCorrect: true,
      })

      // ハート状態を更新（正解時のみheartsが返る）
      if (result.hearts) {
        updateFromConsumeResponse(result.hearts)
      }

      // ストリークをAsyncStorageに保存（キャッシュ更新）
      const today = getTodayDateString()
      await saveStreakFromApi(result.streak, result.completedDates, today)

      // 一覧画面のキャッシュ更新用にステータスを保存
      await saveStatusUpdate({ id: problem.id, status: 'solved' })

      // ストリーク更新画面への遷移
      if (result.streak.updated) {
        setIsSolved(true)
        router.push(`/streak-update?count=${result.streak.currentCount}`)
        return true
      }

      return true
    } catch (error) {
      console.error('[Tsumeshogi] recordTsumeshogi failed:', error)
      if (error instanceof ApiError) {
        if (error.code === 'NO_HEARTS_LEFT') {
          Alert.alert('ハートが足りません', 'ハートが回復するまでお待ちください。')
        } else {
          Alert.alert('エラー', error.message)
        }
      } else {
        Alert.alert('通信エラー', '通信に失敗しました。もう一度お試しください。')
      }
      return false
    }
  }, [problem, updateFromConsumeResponse])

  /**
   * 不正解時の処理（useTsumeshogiGameに渡す）
   *
   * 学習記録のみ作成（ハート消費なし、ストリーク更新なし）
   */
  const handleIncorrect = useCallback(() => {
    if (!problem) return
    setFeedback('incorrect')

    // 一覧画面のキャッシュ更新用にステータスを保存（APIの成功を待たない）
    // 既にsolvedの場合はin_progressに降格させない
    if (params.status !== 'solved') {
      saveStatusUpdate({ id: problem.id, status: 'in_progress' }).catch((e) => {
        console.warn('[Tsumeshogi] saveStatusUpdate failed:', e)
      })
    }

    // バックグラウンドでAPI呼び出し（結果は待たない）
    recordTsumeshogi({
      tsumeshogiId: problem.id,
      isCorrect: false,
    }).catch((error) => {
      console.error('[Tsumeshogi] recordTsumeshogi (incorrect) failed:', error)
    })
  }, [problem, params.status])

  // ゲームフックを使用（Hooks呼び出しは条件分岐の前に行う）
  const game = useTsumeshogiGame(problemForGame, {
    onCorrect: handleCorrect,
    onIncorrect: handleIncorrect,
    onNotCheck: () =>
      Alert.alert('王手ではありません', '詰将棋では王手の連続で詰ませる必要があります'),
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

  // ヘッダータイトル用の情報（メモ化）※フックは早期リターンの前に呼ぶ
  const { headerTitle, nextId, nextSfen, nextStatus } = useMemo(() => {
    if (!problem || !problemIds) {
      return { headerTitle: '', nextId: null, nextSfen: null, nextStatus: null }
    }
    const movesLabel = MOVES_LABELS[problem.moveCount] || `${problem.moveCount}手詰め`
    const currentIndex = problemIds.indexOf(problem.id)
    const problemNumber = currentIndex + 1
    const nextIndex = currentIndex + 1
    return {
      headerTitle: `${movesLabel} 問題${problemNumber}`,
      nextId: problemIds[nextIndex] ?? null,
      nextSfen: problemSfens?.[nextIndex] ?? null,
      nextStatus: problemStatuses?.[nextIndex] ?? null,
    }
  }, [problem, problemIds, problemSfens, problemStatuses])

  // 次の問題へ遷移
  const handleNextProblem = useCallback(() => {
    if (!nextId) return
    // 次の問題に遷移する前にハートをチェック（手動遷移のため事前確認が必要）
    if (!checkHeartsAvailable(hearts, HEART_COST)) return

    // キャッシュデータがあればparamsで渡す（API呼び出し削減）
    if (nextSfen && problem && problemIds && problemSfens && problemStatuses) {
      router.replace({
        pathname: '/tsumeshogi/[id]',
        params: {
          id: nextId,
          sfen: nextSfen,
          moveCount: String(problem.moveCount),
          status: nextStatus ?? undefined,
          problemIds: JSON.stringify(problemIds),
          problemSfens: JSON.stringify(problemSfens),
          problemStatuses: JSON.stringify(problemStatuses),
        },
      })
    } else {
      // キャッシュがなければIDのみで遷移（API取得になる）
      router.replace({ pathname: '/tsumeshogi/[id]', params: { id: nextId } })
    }
  }, [nextId, nextSfen, nextStatus, problem, problemIds, problemSfens, problemStatuses, hearts])

  // ローディング中
  if (heartsLoading || isLoadingProblem) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: palette.gameBackground },
        ]}
      >
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>読み込み中...</Text>
      </View>
    )
  }

  // エラー発生時
  if (heartsError || problemError) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: palette.gameBackground },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.text.primary }]}>
          {problemError || heartsError || 'データの取得に失敗しました'}
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
            <TouchableOpacity onPress={handleNextProblem} disabled={!nextId} activeOpacity={0.8}>
              <Animated.View
                style={[
                  styles.footerButton,
                  {
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: colors.gamification.success,
                  },
                ]}
              >
                <Text style={[styles.footerButtonText, { color: palette.white }]}>次の問題へ</Text>
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
                <Text style={[styles.footerButtonText, { color: palette.orange }]}>やり直し</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <View
          style={[
            styles.homeIndicatorArea,
            { backgroundColor: palette.gameBackground, height: insets.bottom },
          ]}
        />
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
