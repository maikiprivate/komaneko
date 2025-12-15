/**
 * レッスン画面
 *
 * 問題を順番に解いていくレッスン形式の学習画面
 */

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { KomanekoCutIn } from '@/components/KomanekoCutIn'
import { FeedbackOverlay } from '@/components/shogi/FeedbackOverlay'
import { GameFooter } from '@/components/shogi/GameFooter'
import { PieceStand } from '@/components/shogi/PieceStand'
import { PromotionDialog } from '@/components/shogi/PromotionDialog'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { useTheme } from '@/components/useTheme'
import { useLessonGame } from '@/hooks/useLessonGame'
import { useHeartsGate } from '@/lib/hearts/useHeartsGate'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import type { Perspective } from '@/lib/shogi/types'
import { getLessonById } from '@/mocks/lessonData'

// 消費ハート数（将来的にはlesson.heartCostから取得）
const HEART_COST = 1

export default function LessonPlayScreen() {
  const { colors, palette } = useTheme()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>()

  // ハート管理（開始時チェック + 完了時消費）
  const heartsGate = useHeartsGate({ heartCost: HEART_COST })

  // レッスンデータを取得
  const lesson = getLessonById(courseId ?? '', lessonId ?? '')

  /**
   * ゲームロジックフック（条件分岐の前に呼び出す - Rules of Hooks）
   *
   * ハート消費パターン:
   * - レッスン: 最終問題完了時にonComplete()で消費（自動進行のため事前チェック不要）
   * - 詰将棋: 正解時に消費 + 次の問題へ遷移前にcheckAvailable()
   */
  const game = useLessonGame({
    courseId: courseId ?? '',
    lessonId: lessonId ?? '',
    lesson,
    onComplete: heartsGate.consumeOnComplete,
  })

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
    perspective,
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
            <View style={[styles.progressBar, { backgroundColor: colors.background.primary }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${game.problem.progressPercent}%`, backgroundColor: palette.orange },
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
