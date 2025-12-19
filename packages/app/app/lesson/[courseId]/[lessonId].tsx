/**
 * レッスン画面
 *
 * 問題を順番に解いていくレッスン形式の学習画面
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import {
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
import { recordLesson } from '@/lib/api/lesson'
import {
  checkHeartsAvailable,
  hasEnoughHearts,
} from '@/lib/hearts/checkHeartsAvailable'
import { useHearts } from '@/lib/hearts/useHearts'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import type { Perspective } from '@/lib/shogi/types'
import {
  getTodayDateString,
  saveStreakFromApi,
} from '@/lib/streak/streakStorage'
import { getLessonById } from '@/mocks/lessonData'

// 消費ハート数（将来的にはlesson.heartCostから取得）
const HEART_COST = 1

export default function LessonPlayScreen() {
  const { colors, palette } = useTheme()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { courseId, lessonId } = useLocalSearchParams<{
    courseId: string
    lessonId: string
  }>()

  // ハート管理
  const { hearts, isLoading, error, updateFromConsumeResponse } = useHearts()

  // 初回チェック済みフラグ
  const hasCheckedRef = useRef(false)

  // レッスンデータを取得
  const lesson = getLessonById(courseId ?? '', lessonId ?? '')

  // 初回ロード完了時にハートチェック
  useEffect(() => {
    if (isLoading || hasCheckedRef.current) return
    hasCheckedRef.current = true

    // エラー時はチェックしない
    if (error) return

    // ハートが足りない場合はアラート表示して戻る
    if (!hasEnoughHearts(hearts, HEART_COST)) {
      checkHeartsAvailable(hearts, HEART_COST)
      router.back()
    }
  }, [isLoading, error, hearts])

  /**
   * レッスン完了時のコールバック
   *
   * API: POST /api/lesson/record
   * - 学習記録作成（問題ごとの詳細含む）
   * - ハート消費
   * - ストリーク更新
   */
  const handleComplete = useCallback(
    async (data: LessonCompletionData): Promise<boolean> => {
      if (!lessonId) return false

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
        })

        // ハート状態を更新
        if (result.hearts) {
          updateFromConsumeResponse(result.hearts)
        }

        // ストリークをAsyncStorageに保存
        const today = getTodayDateString()
        await saveStreakFromApi(result.streak, result.completedDates, today)

        // ストリーク更新画面への遷移
        if (result.streak.updated) {
          router.push(
            `/streak-update?count=${result.streak.currentCount}&isNewRecord=${result.streak.isNewRecord}`
          )
        }

        return true
      } catch (err) {
        console.error('Failed to record lesson completion:', err)
        return false
      }
    },
    [lessonId, updateFromConsumeResponse]
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
          <KomanekoComment message={game.problem.current?.instruction ?? ''} />
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
