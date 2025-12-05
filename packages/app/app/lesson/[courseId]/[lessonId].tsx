import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KomanekoComment } from '@/components/KomanekoComment'
import { KomanekoCutIn } from '@/components/KomanekoCutIn'
import { FeedbackOverlay, type FeedbackType } from '@/components/shogi/FeedbackOverlay'
import { GameFooter } from '@/components/shogi/GameFooter'
import { PieceStand } from '@/components/shogi/PieceStand'
import { PromotionDialog } from '@/components/shogi/PromotionDialog'
import { ShogiBoard } from '@/components/shogi/ShogiBoard'
import { useTheme } from '@/components/useTheme'
import { useSolutionPlayback, type MoveHighlight } from '@/hooks/useSolutionPlayback'
import { getPieceStandOrder } from '@/lib/shogi/perspective'
import { parseSfen } from '@/lib/shogi/sfen'
import {
  getPossibleMoves,
  getDropPositions,
  makeMove,
  getPromotionOptions,
} from '@/lib/shogi/moveGenerator'
import type { BoardState, Perspective, PieceType, Position } from '@/lib/shogi/types'
import { getLessonById } from '@/mocks/lessonData'

export default function LessonPlayScreen() {
  const { colors, palette } = useTheme()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>()

  // レッスンデータを取得
  const lesson = getLessonById(courseId ?? '', lessonId ?? '')
  const problems = lesson?.problems ?? []

  // 問題の状態
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const totalProblems = problems.length
  const currentProblem = problems[currentProblemIndex]

  // 開始時刻（完了時間計算用）
  const startTimeRef = useRef(Date.now())

  // 初期盤面をパース（メモ化）
  const initialState = useMemo(() => parseSfen(currentProblem.sfen), [currentProblem.sfen])

  // 盤面の状態
  const [boardState, setBoardState] = useState<BoardState>(initialState)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedCaptured, setSelectedCaptured] = useState<PieceType | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])

  // 成り選択
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(
    null,
  )

  // フィードバック
  const [feedback, setFeedback] = useState<FeedbackType>('none')
  // フィードバック後のアクション（'advance': 次の問題へ, 'reset': 盤面リセット）
  const [pendingAction, setPendingAction] = useState<'advance' | 'reset' | null>(null)

  // ヒントのハイライト
  const [hintHighlight, setHintHighlight] = useState<MoveHighlight | null>(null)

  // 現在の問題で間違えたかどうか（初回正解判定用）
  const [hasAttemptedWrong, setHasAttemptedWrong] = useState(false)

  // 解答再生フック
  const solutionPlayback = useSolutionPlayback()

  // 視点（レッスンは常に先手視点）
  const perspective: Perspective = 'sente'

  // 画面幅から余白を引いて9マスで割る
  const cellSize = Math.floor((width - 48) / 9)
  const boardWidth = cellSize * 9 + 8 + 12

  // 視点に応じた駒台の順序
  const { top: topStand, bottom: bottomStand } = getPieceStandOrder(
    boardState.capturedPieces.sente,
    boardState.capturedPieces.gote,
    perspective,
  )

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedCaptured(null)
    setPossibleMoves([])
  }, [])

  // フィードバック完了時の処理
  const handleFeedbackComplete = useCallback(() => {
    if (pendingAction === 'advance') {
      // 次の問題へ進む（常に最新の状態を使用）
      const isFirstTryCorrect = !hasAttemptedWrong
      const newCorrectCount = isFirstTryCorrect ? correctCount + 1 : correctCount
      if (isFirstTryCorrect) {
        setCorrectCount(newCorrectCount)
      }

      if (currentProblemIndex < totalProblems - 1) {
        const nextIndex = currentProblemIndex + 1
        const nextProblem = problems[nextIndex]
        setCurrentProblemIndex(nextIndex)
        setBoardState(parseSfen(nextProblem.sfen))
        clearSelection()
        setHasAttemptedWrong(false)
      } else {
        // 完了時間を計算
        const elapsedMs = Date.now() - startTimeRef.current
        const totalSeconds = Math.floor(elapsedMs / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

        router.replace({
          pathname: '/lesson/result',
          params: {
            correct: String(newCorrectCount),
            total: String(totalProblems),
            courseId: courseId ?? '',
            lessonId: lessonId ?? '',
            time: timeString,
          },
        })
      }
    } else if (pendingAction === 'reset') {
      // 盤面をリセット
      setBoardState(parseSfen(currentProblem.sfen))
    }

    setPendingAction(null)
    setFeedback('none')
  }, [pendingAction, hasAttemptedWrong, correctCount, currentProblemIndex, totalProblems, clearSelection, courseId, lessonId, currentProblem.sfen])

  // 正解判定
  const checkAnswer = useCallback(
    (from: Position, to: Position, promote?: boolean) => {
      // ヒントをクリア
      setHintHighlight(null)

      const correct = currentProblem.correctMove
      const isCorrect =
        from.row === correct.from.row &&
        from.col === correct.from.col &&
        to.row === correct.to.row &&
        to.col === correct.to.col &&
        (correct.promote === undefined || promote === correct.promote)

      if (isCorrect) {
        // 盤面を更新してから正解フィードバック
        const newState = makeMove(boardState, from, to, promote ?? false)
        setBoardState(newState)
        setFeedback('correct')
        setPendingAction('advance')
      } else {
        // 間違えたことを記録
        setHasAttemptedWrong(true)
        setFeedback('incorrect')
        setPendingAction('reset')
      }
      clearSelection()
    },
    [currentProblem, boardState, clearSelection],
  )

  // セルタップ処理（詰将棋と共通ロジック）
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      // 解答再生中は操作をブロック
      if (solutionPlayback.isPlaying) return

      const targetPos = { row, col }
      const piece = boardState.board[row][col]

      // 持ち駒選択中の場合
      if (selectedCaptured) {
        if (piece?.owner === 'sente') {
          // 自分の駒を選択し直す
          clearSelection()
          setSelectedPosition(targetPos)
          const moves = getPossibleMoves(boardState.board, targetPos, piece)
          setPossibleMoves(moves)
        } else {
          // 空きマスまたは相手の駒 → 選択解除
          // TODO: 持ち駒を打つ問題を実装する際はここで打ち処理を追加
          clearSelection()
        }
        return
      }

      // 盤上の駒選択中の場合
      if (selectedPosition) {
        // 同じ位置をクリックで選択解除
        if (selectedPosition.row === row && selectedPosition.col === col) {
          clearSelection()
          return
        }

        // 移動可能なマスなら移動
        const canMove = possibleMoves.some((p) => p.row === row && p.col === col)

        if (canMove) {
          const selectedPiece = boardState.board[selectedPosition.row][selectedPosition.col]
          if (!selectedPiece) {
            clearSelection()
            return
          }

          // 成りの選択肢を確認
          const promotions = getPromotionOptions(
            selectedPiece.type,
            selectedPosition,
            targetPos,
            'sente',
          )

          if (promotions.length === 2) {
            // 成り/不成り選択が必要
            setPendingPromotion({ from: selectedPosition, to: targetPos })
            clearSelection()
          } else {
            // 強制成りまたは成れない
            const from = selectedPosition
            checkAnswer(from, targetPos, promotions[0])
          }
        } else if (piece?.owner === 'sente') {
          // 別の自分の駒を選択
          setSelectedPosition(targetPos)
          const moves = getPossibleMoves(boardState.board, targetPos, piece)
          setPossibleMoves(moves)
        } else {
          clearSelection()
        }
        return
      }

      // 何も選択していない場合
      if (piece?.owner === 'sente') {
        setSelectedPosition(targetPos)
        const moves = getPossibleMoves(boardState.board, targetPos, piece)
        setPossibleMoves(moves)
      }
    },
    [
      boardState,
      selectedPosition,
      selectedCaptured,
      possibleMoves,
      clearSelection,
      checkAnswer,
      solutionPlayback.isPlaying,
    ],
  )

  // 持ち駒タップ処理
  const handleCapturedPress = useCallback(
    (pieceType: PieceType) => {
      // 解答再生中は操作をブロック
      if (solutionPlayback.isPlaying) return

      const hand = boardState.capturedPieces.sente
      if (!hand[pieceType]) return

      // 同じ駒を再タップで選択解除
      if (selectedCaptured === pieceType) {
        clearSelection()
        return
      }

      clearSelection()
      setSelectedCaptured(pieceType)

      // 打ち込み可能なマスを計算
      const drops = getDropPositions(boardState.board, pieceType, 'sente')
      setPossibleMoves(drops)
    },
    [boardState, selectedCaptured, clearSelection, solutionPlayback.isPlaying],
  )

  // 成り選択処理
  const handlePromotionSelect = useCallback(
    (promote: boolean) => {
      if (pendingPromotion) {
        checkAnswer(pendingPromotion.from, pendingPromotion.to, promote)
        setPendingPromotion(null)
      }
    },
    [pendingPromotion, checkAnswer],
  )

  // やり直し
  const handleReset = useCallback(() => {
    solutionPlayback.reset()
    setBoardState(parseSfen(currentProblem.sfen))
    clearSelection()
    setHintHighlight(null)
  }, [currentProblem.sfen, clearSelection, solutionPlayback])

  // ヒント表示（駒をハイライト）
  const handleHint = useCallback(() => {
    const correct = currentProblem.correctMove
    setHintHighlight({
      from: correct.from,
      to: correct.to,
    })
  }, [currentProblem.correctMove])

  // 解答表示（カットイン→駒移動→カットイン→リセット）
  const handleSolution = useCallback(() => {
    // 既に再生中なら何もしない
    if (solutionPlayback.phase !== 'none') {
      return
    }

    // 解答を見た場合も間違えとしてカウント
    setHasAttemptedWrong(true)

    solutionPlayback.play(
      {
        correctMove: currentProblem.correctMove,
        sfen: currentProblem.sfen,
      },
      {
        onPrepare: () => {
          clearSelection()
          setHintHighlight(null)
        },
        onBoardUpdate: (sfen, move) => {
          const freshState = parseSfen(sfen)
          const newState = makeMove(freshState, move.from, move.to, move.promote)
          setBoardState(newState)
        },
        onBoardReset: (sfen) => {
          setBoardState(parseSfen(sfen))
        },
      },
    )
  }, [currentProblem, clearSelection, solutionPlayback])

  // プログレスバーの幅
  const progressPercent = ((currentProblemIndex + 1) / totalProblems) * 100

  // レッスンまたは問題が見つからない場合
  if (!lesson || !currentProblem) {
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
                  { width: `${progressPercent}%`, backgroundColor: palette.orange },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text.secondary }]}>
              {currentProblemIndex + 1}/{totalProblems}
            </Text>
          </View>
        </View>

        {/* 駒猫の指示 */}
        <View style={styles.commentArea}>
          <KomanekoComment message={currentProblem.instruction} />
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
              board={boardState.board}
              perspective={perspective}
              cellSize={cellSize}
              onCellPress={handleCellPress}
              selectedPosition={selectedPosition}
              possibleMoves={possibleMoves}
              hintHighlight={hintHighlight}
              lastMove={solutionPlayback.lastMove}
            />
            <PieceStand
              pieces={bottomStand.pieces}
              isOpponent={bottomStand.isOpponent}
              label={bottomStand.label}
              width={boardWidth}
              onPiecePress={handleCapturedPress}
              selectedPiece={selectedCaptured}
              hintPiece={hintHighlight?.piece}
            />
          </View>

          {/* フィードバックオーバーレイ */}
          <FeedbackOverlay type={feedback} onComplete={handleFeedbackComplete} />

          {/* 成り選択ダイアログ */}
          <PromotionDialog visible={!!pendingPromotion} onSelect={handlePromotionSelect} />
        </View>

        <View style={styles.spacer} />

        {/* 解答再生カットイン（画面全体をカバー） */}
        <KomanekoCutIn message={solutionPlayback.cutInMessage} visible={solutionPlayback.isCutInVisible} />

        {/* フッター */}
        <GameFooter
          onReset={handleReset}
          onHint={handleHint}
          onSolution={handleSolution}
          disabled={solutionPlayback.isPlaying}
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
})
