/**
 * レッスン画面
 *
 * 問題を順番に解いていくレッスン形式の学習画面
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { KomanekoCutIn } from '@/components/KomanekoCutIn'
import { FeedbackOverlay } from '@/components/shogi/FeedbackOverlay'
import { GameFooter } from '@/components/shogi/GameFooter'
import { PieceStand } from '@/components/shogi/PieceStand'
import { PromotionDialog } from '@/components/shogi/PromotionDialog'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { useTheme } from '@/components/useTheme'
import {
  type LessonCompletionData,
  useLessonGame,
} from '@/hooks/useLessonGame'
import { getLesson, recordLesson, type LessonData, type ProblemData } from '@/lib/api/lesson'
import {
  checkHeartsAvailable,
  hasEnoughHearts,
} from '@/lib/hearts/checkHeartsAvailable'
import { useHearts } from '@/lib/hearts/useHearts'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import type { Perspective, PieceType, Position } from '@/lib/shogi/types'
import { SFEN_TO_PIECE } from '@/lib/shogi/types'
import {
  getTodayDateString,
  saveStreakFromApi,
} from '@/lib/streak/streakStorage'
import type { SequenceLesson, SequenceProblem, SequenceMove } from '@/mocks/lessonData'

/**
 * パースされた手の型
 * - 移動: type='move', from/to/promote
 * - 駒打ち: type='drop', to/piece
 */
interface ParsedMove {
  type: 'move' | 'drop'
  from?: Position
  to: Position
  promote?: boolean
  piece?: PieceType
}

/**
 * SFEN形式の手を ParsedMove 形式に変換
 *
 * 移動の例:
 *   "5e5d" → { type: 'move', from: {row: 4, col: 4}, to: {row: 3, col: 4} }
 *   "5c5b+" → { type: 'move', from: {row: 2, col: 4}, to: {row: 1, col: 4}, promote: true }
 *
 * 駒打ちの例:
 *   "P*5e" → { type: 'drop', to: {row: 4, col: 4}, piece: 'fu' }
 *   "G*3c" → { type: 'drop', to: {row: 2, col: 6}, piece: 'kin' }
 */
function parseSfenMove(move: string): ParsedMove | null {
  if (!move || move.length < 4) return null

  // 駒打ち判定: "X*YZ" 形式 (例: "P*5e")
  if (move[1] === '*') {
    const pieceChar = move[0].toUpperCase()
    const pieceType = SFEN_TO_PIECE[pieceChar]
    if (!pieceType) return null

    const toCol = 9 - parseInt(move[2], 10)
    const toRow = move.charCodeAt(3) - 'a'.charCodeAt(0)

    // 範囲チェック
    if (toCol < 0 || toCol > 8 || toRow < 0 || toRow > 8 || isNaN(toCol)) {
      return null
    }

    return { type: 'drop', to: { row: toRow, col: toCol }, piece: pieceType }
  }

  // 通常移動: "XaYb" または "XaYb+" 形式
  const promote = move.endsWith('+')
  const cleanMove = promote ? move.slice(0, -1) : move

  // SFEN列: 1-9 (9が左端、1が右端) → col: 0-8 (0が右端相当)
  // SFEN行: a-i (aが上端) → row: 0-8
  const fromCol = 9 - parseInt(cleanMove[0], 10)
  const fromRow = cleanMove.charCodeAt(1) - 'a'.charCodeAt(0)
  const toCol = 9 - parseInt(cleanMove[2], 10)
  const toRow = cleanMove.charCodeAt(3) - 'a'.charCodeAt(0)

  // 範囲チェック（列・行ともに0-8の範囲内）
  if (
    isNaN(fromCol) ||
    isNaN(toCol) ||
    fromCol < 0 ||
    fromCol > 8 ||
    toCol < 0 ||
    toCol > 8 ||
    fromRow < 0 ||
    fromRow > 8 ||
    toRow < 0 ||
    toRow > 8
  ) {
    return null
  }

  return {
    type: 'move',
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    ...(promote && { promote: true }),
  }
}

/**
 * API の ProblemData を useLessonGame が期待する SequenceProblem 形式に変換
 *
 * moveTree: string[][] を SequenceMove[][] に変換
 * 各バリエーションは [自分の手, 相手の手, 自分の手, ...] のシーケンス
 */
function convertApiProblemToSequenceProblem(problem: ProblemData): SequenceProblem | null {
  const moveTree = problem.moveTree as string[][] | undefined
  if (!moveTree || moveTree.length === 0) {
    if (__DEV__) {
      console.warn(`[convertApiProblemToSequenceProblem] Problem ${problem.id} has no moveTree`)
    }
    return null
  }

  // 各バリエーションを SequenceMove[] に変換
  const correctSequences: SequenceMove[][] = moveTree
    .map((sequence, varIndex) => {
      const moves = sequence.map((moveStr, moveIndex) => {
        const parsed = parseSfenMove(moveStr)
        if (!parsed && __DEV__) {
          console.warn(
            `[convertApiProblemToSequenceProblem] Failed to parse move "${moveStr}" ` +
            `in problem ${problem.id}, variation ${varIndex}, move ${moveIndex}`
          )
        }
        return parsed
      })
      return moves.filter((move): move is SequenceMove => move !== null)
    })
    .filter((seq) => seq.length > 0)

  if (correctSequences.length === 0) {
    if (__DEV__) {
      console.warn(`[convertApiProblemToSequenceProblem] Problem ${problem.id} has no valid sequences after parsing`)
    }
    return null
  }

  return {
    id: problem.id,
    sfen: problem.sfen,
    instruction: problem.instruction || '',
    correctSequences,
  }
}

/**
 * API の LessonData を useLessonGame が期待する SequenceLesson 形式に変換
 */
function convertApiLessonToSequenceLesson(lessonData: LessonData): SequenceLesson | null {
  const problems = lessonData.problems
    .map(convertApiProblemToSequenceProblem)
    .filter((p): p is SequenceProblem => p !== null)

  if (problems.length === 0) return null

  return {
    id: lessonData.id,
    title: lessonData.title,
    status: 'available',
    problems,
  }
}

// 消費ハート数（将来的にはlesson.heartCostから取得）
const HEART_COST = 1

export default function LessonPlayScreen() {
  const { colors, palette } = useTheme()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { courseId, lessonId, isReview } = useLocalSearchParams<{
    courseId: string
    lessonId: string
    isReview?: string
  }>()

  // 復習モードかどうか
  const isReviewMode = isReview === 'true'

  // ハート管理
  const { hearts, isLoading: heartsLoading, error: heartsError, updateFromConsumeResponse } = useHearts()

  // レッスンデータの状態
  const [lessonData, setLessonData] = useState<LessonData | null>(null)
  const [isLoadingLesson, setIsLoadingLesson] = useState(true)
  const [lessonError, setLessonError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  // 初回チェック済みフラグ
  const hasCheckedRef = useRef(false)

  // レッスンデータをAPIから取得
  useEffect(() => {
    if (!lessonId) {
      setLessonError('レッスンIDが指定されていません')
      setIsLoadingLesson(false)
      return
    }

    cancelledRef.current = false
    setIsLoadingLesson(true)
    setLessonError(null)

    getLesson(lessonId)
      .then((data) => {
        if (cancelledRef.current) return
        setLessonData(data)
      })
      .catch((err) => {
        if (!cancelledRef.current) setLessonError(err.message || 'データの取得に失敗しました')
      })
      .finally(() => {
        if (!cancelledRef.current) setIsLoadingLesson(false)
      })

    return () => {
      cancelledRef.current = true
    }
  }, [lessonId])

  // APIデータをuseLessonGameが期待する形式に変換（メモ化）
  const lesson = useMemo(() => {
    if (!lessonData) return undefined
    return convertApiLessonToSequenceLesson(lessonData) ?? undefined
  }, [lessonData])

  // ローディング状態の統合
  const isLoading = heartsLoading || isLoadingLesson
  const error = heartsError || lessonError

  // 初回ロード完了時にハートチェック（復習モードではスキップ）
  useEffect(() => {
    if (isLoading || hasCheckedRef.current || isReviewMode) return
    hasCheckedRef.current = true

    // エラー時はチェックしない
    if (error) return

    // ハートが足りない場合はアラート表示して戻る
    if (!hasEnoughHearts(hearts, HEART_COST)) {
      checkHeartsAvailable(hearts, HEART_COST)
      router.back()
    }
  }, [isLoading, error, hearts, isReviewMode])

  /**
   * レッスン完了時のコールバック
   *
   * API: POST /api/lesson/record
   * - 学習記録作成（問題ごとの詳細含む）
   * - ハート消費
   * - ストリーク更新
   *
   * 復習モードではAPIを呼ばない（ハート消費なし、記録なし）
   *
   * 戻り値:
   * - true: 成功（結果画面へ遷移する）
   * - false: 失敗
   * - 'streak': ストリーク画面へ遷移済み（結果画面への遷移は不要）
   */
  const handleComplete = useCallback(
    async (data: LessonCompletionData): Promise<boolean | 'streak'> => {
      if (!lessonId || !courseId) return false

      // 復習モードではAPI呼び出しをスキップ
      if (isReviewMode) {
        return true
      }

      try {
        const result = await recordLesson({
          lessonId,
          problems: data.problems.map((p) => ({
            problemId: p.problemId,
            problemIndex: p.problemIndex,
            isCorrect: p.isCorrect,
            usedHint: p.usedHint,
            usedSolution: p.usedSolution,
          })),
          completionSeconds: data.completionSeconds,
        })

        // ハート状態を更新
        if (result.hearts) {
          updateFromConsumeResponse(result.hearts)
        }

        // ストリークをAsyncStorageに保存
        const today = getTodayDateString()
        await saveStreakFromApi(result.streak, result.completedDates, today)

        // ストリーク更新画面への遷移（結果画面パラメータを含む）
        if (result.streak.updated) {
          // 完了時間を計算（data.completionSecondsから）
          const totalSeconds = data.completionSeconds
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds % 60
          const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

          router.push({
            pathname: '/streak-update',
            params: {
              count: String(result.streak.currentCount),
              isNewRecord: String(result.streak.isNewRecord),
              // 結果画面パラメータ（ストリーク画面から遷移するため）
              lessonResult: 'true',
              correct: String(data.correctCount),
              total: String(data.totalCount),
              courseId,
              lessonId,
              time: timeString,
            },
          })
          return 'streak'
        }

        return true
      } catch (err) {
        console.error('Failed to record lesson completion:', err)
        return false
      }
    },
    [lessonId, courseId, isReviewMode, updateFromConsumeResponse]
  )

  /**
   * ゲームロジックフック（条件分岐の前に呼び出す - Rules of Hooks）
   */
  const game = useLessonGame({
    courseId: courseId ?? '',
    lessonId: lessonId ?? '',
    lesson,
    onComplete: handleComplete,
  })

  // ローディング中
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: palette.gameBackground },
        ]}
      >
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          読み込み中...
        </Text>
      </View>
    )
  }

  // エラー発生時
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: palette.gameBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <FontAwesome name="times" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            データの取得に失敗しました
          </Text>
        </View>
      </View>
    )
  }

  // レッスンが見つからない場合
  if (!game.isReady) {
    return (
      <View style={[styles.container, { backgroundColor: palette.gameBackground }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <FontAwesome name="times" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            レッスンが見つかりません
          </Text>
        </View>
      </View>
    )
  }

  // 視点（レッスンは常に先手視点）
  const perspective: Perspective = 'sente'

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 48) / 9)
  const boardWidth = cellSize * 9 + 8 + 12

  // 視点に応じた駒台の順序
  const { top: topStand, bottom: bottomStand } = getPieceStandOrder(
    game.board.state.capturedPieces.sente,
    game.board.state.capturedPieces.gote,
    perspective
  )

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: palette.gameBackground }]}>
        {/* ヘッダー */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <FontAwesome name="times" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { backgroundColor: colors.background.primary }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${game.problem.progressPercent}%`,
                    backgroundColor: palette.orange,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text.secondary }]}>
              {game.problem.index + 1}/{game.problem.total}
            </Text>
          </View>
        </View>

        {/* 駒猫の指示 */}
        <View style={styles.commentArea}>
          <KomanekoComment
            message={
              game.isOpponentThinking
                ? '相手の番にゃ...'
                : (game.problem.current?.instruction ?? '')
            }
          />
        </View>

        {/* 盤面 */}
        <View style={styles.boardSection}>
          <View style={styles.content}>
            <PieceStand
              pieces={topStand.pieces}
              isOpponent={topStand.isOpponent}
              label={topStand.label}
              width={boardWidth}
            />
            <ShogiBoard
              board={game.board.state.board}
              perspective={perspective}
              cellSize={cellSize}
              onCellPress={game.board.onCellPress}
              selectedPosition={game.board.selectedPosition}
              possibleMoves={game.board.possibleMoves}
              hintHighlight={game.hint.highlight}
              lastMove={game.solutionPlayback.lastMove}
            />
            <PieceStand
              pieces={bottomStand.pieces}
              isOpponent={bottomStand.isOpponent}
              label={bottomStand.label}
              width={boardWidth}
              onPiecePress={game.board.onCapturedPress}
              selectedPiece={game.board.selectedCaptured}
              hintPiece={game.hint.highlight?.piece}
            />
          </View>

          {/* フィードバックオーバーレイ */}
          <FeedbackOverlay type={game.feedback.type} onComplete={game.feedback.onComplete} />

          {/* 成り選択ダイアログ */}
          <PromotionDialog visible={!!game.promotion.pending} onSelect={game.promotion.onSelect} />
        </View>

        <View style={styles.spacer} />

        {/* 解答再生カットイン（画面全体をカバー） */}
        <KomanekoCutIn
          message={game.solutionPlayback.cutInMessage}
          visible={game.solutionPlayback.isCutInVisible}
        />

        {/* フッター */}
        <GameFooter
          onReset={game.footer.onReset}
          onHint={game.footer.onHint}
          onSolution={game.footer.onSolution}
          disabled={game.footer.disabled}
        />
        <View
          style={[
            styles.homeIndicatorArea,
            { backgroundColor: colors.background.primary, height: insets.bottom },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  closeButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 32,
  },
  commentArea: {
    paddingVertical: 8,
  },
  boardSection: {
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    gap: 4,
  },
  spacer: {
    flex: 1,
  },
  homeIndicatorArea: {
    // height is set dynamically using insets.bottom
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
})
