/**
 * レッスンゲームフック
 *
 * レッスン画面のゲームロジックを管理する。
 * - 問題の進行管理
 * - 正解判定
 * - スコアリング
 * - 盤面状態管理
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { router } from 'expo-router'

import {
  getPossibleMoves,
  getDropPositions,
  makeMove,
  getPromotionOptions,
} from '@/lib/shogi/moveGenerator'
import { parseSfen } from '@/lib/shogi/sfen'
import type { BoardState, PieceType, Position } from '@/lib/shogi/types'
import { useSolutionPlayback, type MoveHighlight } from '@/hooks/useSolutionPlayback'
import type { Lesson, Problem } from '@/mocks/lessonData'

/** フィードバック状態 */
export type FeedbackType = 'none' | 'correct' | 'incorrect'

/** フックの引数 */
interface UseLessonGameOptions {
  courseId: string
  lessonId: string
  lesson: Lesson | undefined
}

/** フックの戻り値 */
interface UseLessonGameReturn {
  /** レッスンが有効かどうか */
  isReady: boolean

  /** 問題の状態 */
  problem: {
    current: Problem | null
    index: number
    total: number
    progressPercent: number
  }

  /** スコア */
  score: {
    correctCount: number
  }

  /** 盤面 */
  board: {
    state: BoardState
    selectedPosition: Position | null
    selectedCaptured: PieceType | null
    possibleMoves: Position[]
    onCellPress: (row: number, col: number) => void
    onCapturedPress: (pieceType: PieceType) => void
  }

  /** 成り選択 */
  promotion: {
    pending: { from: Position; to: Position } | null
    onSelect: (promote: boolean) => void
  }

  /** フィードバック */
  feedback: {
    type: FeedbackType
    onComplete: () => void
  }

  /** ヒント */
  hint: {
    highlight: MoveHighlight | null
  }

  /** フッター */
  footer: {
    onReset: () => void
    onHint: () => void
    onSolution: () => void
    disabled: boolean
  }

  /** 解答再生 */
  solutionPlayback: ReturnType<typeof useSolutionPlayback>
}

/** 空の盤面状態 */
const EMPTY_BOARD_STATE: BoardState = {
  board: Array(9).fill(null).map(() => Array(9).fill(null)),
  capturedPieces: {
    sente: {},
    gote: {},
  },
  turn: 'sente',
  moveCount: 1,
}

/**
 * レッスンゲームフック
 */
export function useLessonGame({
  courseId,
  lessonId,
  lesson,
}: UseLessonGameOptions): UseLessonGameReturn {
  const problems = lesson?.problems ?? []
  const isReady = lesson !== undefined && problems.length > 0

  // 問題の状態
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const totalProblems = problems.length
  const currentProblem = problems[currentProblemIndex]

  // 開始時刻（完了時間計算用）
  const startTimeRef = useRef(Date.now())

  // 初期盤面をパース（メモ化）
  const initialState = useMemo(
    () => currentProblem ? parseSfen(currentProblem.sfen) : EMPTY_BOARD_STATE,
    [currentProblem?.sfen]
  )

  // 盤面の状態
  const [boardState, setBoardState] = useState<BoardState>(initialState)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedCaptured, setSelectedCaptured] = useState<PieceType | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])

  // 成り選択
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Position
    to: Position
  } | null>(null)

  // フィードバック
  const [feedback, setFeedback] = useState<FeedbackType>('none')
  const [pendingAction, setPendingAction] = useState<'advance' | 'reset' | null>(null)

  // ヒントのハイライト
  const [hintHighlight, setHintHighlight] = useState<MoveHighlight | null>(null)

  // 現在の問題で間違えたかどうか（初回正解判定用）
  const [hasAttemptedWrong, setHasAttemptedWrong] = useState(false)

  // 解答再生フック
  const solutionPlayback = useSolutionPlayback()

  // プログレスバーの幅
  const progressPercent = ((currentProblemIndex + 1) / totalProblems) * 100

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
            courseId,
            lessonId,
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
  }, [
    pendingAction,
    hasAttemptedWrong,
    correctCount,
    currentProblemIndex,
    totalProblems,
    problems,
    clearSelection,
    courseId,
    lessonId,
    currentProblem.sfen,
  ])

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
    [currentProblem, boardState, clearSelection]
  )

  // セルタップ処理
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
            'sente'
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
    ]
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
    [boardState, selectedCaptured, clearSelection, solutionPlayback.isPlaying]
  )

  // 成り選択処理
  const handlePromotionSelect = useCallback(
    (promote: boolean) => {
      if (pendingPromotion) {
        checkAnswer(pendingPromotion.from, pendingPromotion.to, promote)
        setPendingPromotion(null)
      }
    },
    [pendingPromotion, checkAnswer]
  )

  // やり直し
  const handleReset = useCallback(() => {
    solutionPlayback.reset()
    setBoardState(parseSfen(currentProblem.sfen))
    clearSelection()
    setHintHighlight(null)
  }, [currentProblem.sfen, clearSelection, solutionPlayback])

  // ヒント表示
  const handleHint = useCallback(() => {
    const correct = currentProblem.correctMove
    setHintHighlight({
      from: correct.from,
      to: correct.to,
    })
  }, [currentProblem.correctMove])

  // 解答表示
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
      }
    )
  }, [currentProblem, clearSelection, solutionPlayback])

  return {
    isReady,
    problem: {
      current: currentProblem ?? null,
      index: currentProblemIndex,
      total: totalProblems,
      progressPercent,
    },
    score: {
      correctCount,
    },
    board: {
      state: boardState,
      selectedPosition,
      selectedCaptured,
      possibleMoves,
      onCellPress: handleCellPress,
      onCapturedPress: handleCapturedPress,
    },
    promotion: {
      pending: pendingPromotion,
      onSelect: handlePromotionSelect,
    },
    feedback: {
      type: feedback,
      onComplete: handleFeedbackComplete,
    },
    hint: {
      highlight: hintHighlight,
    },
    footer: {
      onReset: handleReset,
      onHint: handleHint,
      onSolution: handleSolution,
      disabled: solutionPlayback.isPlaying,
    },
    solutionPlayback,
  }
}
