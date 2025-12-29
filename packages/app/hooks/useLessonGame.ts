/**
 * レッスンゲームフック
 *
 * レッスン画面のゲームロジックを管理する。
 * - 問題の進行管理
 * - 正解判定
 * - スコアリング
 * - 盤面状態管理
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { router } from 'expo-router'

import {
  getPossibleMoves,
  getDropPositions,
  makeMove,
  makeDrop,
  getPromotionOptions,
} from '@/lib/shogi/moveGenerator'
import { parseSfen } from '@/lib/shogi/sfen'
import type { BoardState, PieceType, Position } from '@/lib/shogi/types'
import { useSolutionPlayback, type MoveHighlight } from '@/hooks/useSolutionPlayback'
import type { SequenceLesson, SequenceProblem, SequenceMove } from '@/mocks/lessonData'

/** 相手の応手までの遅延時間（ミリ秒） */
const OPPONENT_DELAY_MS = 800

/**
 * 2つのSequenceMoveが一致するか判定
 */
function movesMatch(a: SequenceMove, b: SequenceMove): boolean {
  if (a.type !== b.type) return false
  if (a.to.row !== b.to.row || a.to.col !== b.to.col) return false

  if (a.type === 'drop' && b.type === 'drop') {
    return a.piece === b.piece
  }

  if (a.type === 'move' && b.type === 'move') {
    if (!a.from || !b.from) return false
    if (a.from.row !== b.from.row || a.from.col !== b.from.col) return false
    // promote は undefined と false を同一視
    return (a.promote ?? false) === (b.promote ?? false)
  }

  return false
}

/** フィードバック状態 */
export type FeedbackType = 'none' | 'correct' | 'incorrect'

/** 問題ごとの試行記録（内部用） */
export interface ProblemAttemptState {
  problemId: string
  problemIndex: number
  isCorrect: boolean // 初回正解 && ヒント未使用 && 解答未使用
  usedHint: boolean
  usedSolution: boolean
}

/** 完了データ（API送信用） */
export interface LessonCompletionData {
  correctCount: number // 初回正解数（結果画面表示用）
  totalCount: number // 総問題数
  problems: ProblemAttemptState[] // 問題ごとの詳細
  completionSeconds: number // 完了時間（秒）
}

/** フックの引数 */
interface UseLessonGameOptions {
  courseId: string
  lessonId: string
  lesson: SequenceLesson | undefined
  /** レッスン完了時のコールバック（ハート消費など）。falseを返すと遷移しない */
  onComplete?: (data: LessonCompletionData) => Promise<boolean>
}

/** フックの戻り値 */
interface UseLessonGameReturn {
  /** レッスンが有効かどうか */
  isReady: boolean

  /** 問題の状態 */
  problem: {
    current: SequenceProblem | null
    index: number
    total: number
    progressPercent: number
  }

  /** 相手の思考中フラグ */
  isOpponentThinking: boolean

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
}

/**
 * レッスンゲームフック
 */
export function useLessonGame({
  courseId,
  lessonId,
  lesson,
  onComplete,
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

  // 問題が変わったら盤面をリセット（外部からのインデックス変更にも対応）
  useEffect(() => {
    setBoardState(initialState)
  }, [initialState])

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

  // 現在の問題でヒント・解答を使用したか
  const [usedHint, setUsedHint] = useState(false)
  const [usedSolution, setUsedSolution] = useState(false)

  // 全問題の記録（API送信用）
  const [problemAttempts, setProblemAttempts] = useState<ProblemAttemptState[]>(
    []
  )

  // シーケンス管理（複数手順対応）
  // 現在のシーケンス内での位置（0 = 最初の手、1 = 相手の応手、2 = 次の自分の手...）
  const [sequenceIndex, setSequenceIndex] = useState(0)
  // アクティブな正解バリエーションのインデックス
  const [activeVariationIndices, setActiveVariationIndices] = useState<number[]>([])
  // 相手の思考中フラグ
  const [isOpponentThinking, setIsOpponentThinking] = useState(false)
  // 相手の応手タイマー
  const opponentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 問題が変わったらシーケンスをリセット
  useEffect(() => {
    if (currentProblem) {
      setSequenceIndex(0)
      // 全バリエーションをアクティブにする
      setActiveVariationIndices(
        currentProblem.correctSequences.map((_, i) => i)
      )
    }
  }, [currentProblem])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (opponentTimerRef.current) {
        clearTimeout(opponentTimerRef.current)
      }
    }
  }, [])

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

  // 次の問題へ進む
  const advanceToNextProblem = useCallback(() => {
    const nextIndex = currentProblemIndex + 1
    const nextProblem = problems[nextIndex]
    setCurrentProblemIndex(nextIndex)
    setBoardState(parseSfen(nextProblem.sfen))
    clearSelection()
    // フラグリセット
    setHasAttemptedWrong(false)
    setUsedHint(false)
    setUsedSolution(false)
    // シーケンスリセット
    setSequenceIndex(0)
    setActiveVariationIndices(nextProblem.correctSequences.map((_, i) => i))
  }, [currentProblemIndex, problems, clearSelection])

  // レッスン完了処理
  const handleLessonComplete = useCallback(
    async (
      finalCorrectCount: number,
      allAttempts: ProblemAttemptState[]
    ): Promise<boolean> => {
      // 完了時間を計算
      const elapsedMs = Date.now() - startTimeRef.current
      const totalSeconds = Math.floor(elapsedMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

      // onCompleteコールバック（ハート消費など）を呼び出し
      if (onComplete) {
        const success = await onComplete({
          correctCount: finalCorrectCount,
          totalCount: totalProblems,
          problems: allAttempts,
          completionSeconds: totalSeconds,
        })
        if (!success) {
          return false
        }
      }

      router.replace({
        pathname: '/lesson/result',
        params: {
          correct: String(finalCorrectCount),
          total: String(totalProblems),
          courseId,
          lessonId,
          time: timeString,
        },
      })
      return true
    },
    [onComplete, totalProblems, courseId, lessonId]
  )

  // フィードバック完了時の処理
  const handleFeedbackComplete = useCallback(async () => {
    if (pendingAction === 'advance') {
      // 完全正解判定: 初回正解 && ヒント未使用 && 解答未使用
      const isPerfectCorrect = !hasAttemptedWrong && !usedHint && !usedSolution
      const newCorrectCount = isPerfectCorrect
        ? correctCount + 1
        : correctCount
      if (isPerfectCorrect) {
        setCorrectCount(newCorrectCount)
      }

      // 問題の記録を追加
      const attempt: ProblemAttemptState = {
        problemId: currentProblem?.id ?? '',
        problemIndex: currentProblemIndex,
        isCorrect: isPerfectCorrect,
        usedHint,
        usedSolution,
      }
      const newAttempts = [...problemAttempts, attempt]
      setProblemAttempts(newAttempts)

      // 次の問題へ or レッスン完了
      if (currentProblemIndex < totalProblems - 1) {
        advanceToNextProblem()
      } else {
        const success = await handleLessonComplete(newCorrectCount, newAttempts)
        if (!success) {
          // ハート消費失敗時は遷移しない
          setPendingAction(null)
          setFeedback('none')
          return
        }
        // 画面遷移前にフィードバックをクリア
        setPendingAction(null)
        setFeedback('none')
        return
      }
    } else if (pendingAction === 'reset' && currentProblem) {
      // 盤面とシーケンス状態を同時にリセット
      setBoardState(parseSfen(currentProblem.sfen))
      setSequenceIndex(0)
      setActiveVariationIndices(currentProblem.correctSequences.map((_, i) => i))
    }

    setPendingAction(null)
    setFeedback('none')
  }, [
    pendingAction,
    hasAttemptedWrong,
    usedHint,
    usedSolution,
    correctCount,
    currentProblemIndex,
    totalProblems,
    currentProblem,
    problemAttempts,
    advanceToNextProblem,
    handleLessonComplete,
  ])

  /**
   * 相手の応手を自動実行
   *
   * @param varIndices アクティブな正解バリエーションのインデックス配列
   * @param moveIndex 実行する手のシーケンス内インデックス
   * @param updatedBoardState ユーザーの手適用後の盤面状態（Reactの非同期更新対策）
   */
  const executeOpponentMove = useCallback(
    (varIndices: number[], moveIndex: number, updatedBoardState: BoardState) => {
      if (!currentProblem) return

      setIsOpponentThinking(true)

      opponentTimerRef.current = setTimeout(() => {
        // アクティブなバリエーションから相手の手を取得（どれも同じ手のはず）
        const opponentMove = currentProblem.correctSequences[varIndices[0]][moveIndex]

        // 盤面を更新（updatedBoardStateを使用）
        // TODO: 現在は先手視点のみ対応。後手視点のレッスン追加時は
        // opponent の owner を動的に決定する必要がある（'gote' → perspective に応じて切り替え）
        let newState: BoardState
        if (opponentMove.type === 'drop' && opponentMove.piece) {
          newState = makeDrop(updatedBoardState, opponentMove.piece, opponentMove.to, 'gote')
        } else if (opponentMove.type === 'move' && opponentMove.from) {
          newState = makeMove(updatedBoardState, opponentMove.from, opponentMove.to, opponentMove.promote ?? false)
        } else {
          // 不正な手 - エラーログを出力してリセット
          console.warn('[useLessonGame] Invalid opponent move:', opponentMove)
          setIsOpponentThinking(false)
          return
        }

        setBoardState(newState)
        setSequenceIndex(moveIndex + 1)
        setIsOpponentThinking(false)
      }, OPPONENT_DELAY_MS)
    },
    [currentProblem]
  )

  /**
   * 正解判定（シーケンス対応版）
   *
   * ユーザーの手が現在のシーケンス位置の正解と一致するか判定。
   * 一致した場合:
   *   - 盤面を更新
   *   - シーケンスが続く場合は相手の応手を自動実行
   *   - シーケンス完了時は正解フィードバック
   */
  const checkAnswer = useCallback(
    (userMove: SequenceMove) => {
      if (!currentProblem) return

      // ヒントをクリア
      setHintHighlight(null)

      // 現在の位置での期待される手と比較
      const expectedMoveIndex = sequenceIndex

      // アクティブなバリエーションをフィルタリング
      const matchingVariations = activeVariationIndices.filter((varIdx) => {
        const sequence = currentProblem.correctSequences[varIdx]
        if (expectedMoveIndex >= sequence.length) return false
        const expectedMove = sequence[expectedMoveIndex]
        return movesMatch(userMove, expectedMove)
      })

      // まずユーザーの手を盤面に反映（正解/不正解どちらでも表示するため）
      let newState: BoardState
      if (userMove.type === 'drop' && userMove.piece) {
        newState = makeDrop(boardState, userMove.piece, userMove.to, 'sente')
      } else if (userMove.type === 'move' && userMove.from) {
        newState = makeMove(boardState, userMove.from, userMove.to, userMove.promote ?? false)
      } else {
        clearSelection()
        return
      }

      setBoardState(newState)
      clearSelection()

      if (matchingVariations.length === 0) {
        // 不正解 - 盤面は既に更新済み、フィードバック後に盤面とシーケンスをリセット
        setHasAttemptedWrong(true)
        setFeedback('incorrect')
        setPendingAction('reset')
        return
      }

      // 正解
      setActiveVariationIndices(matchingVariations)

      const nextIndex = expectedMoveIndex + 1
      const sequenceLength = currentProblem.correctSequences[matchingVariations[0]].length

      if (nextIndex >= sequenceLength) {
        // シーケンス完了 → 問題クリア
        setFeedback('correct')
        setPendingAction('advance')
      } else {
        // 相手の手を自動実行
        setSequenceIndex(nextIndex)
        // ※相手の手は奇数インデックス（1, 3, 5, ...）
        // 次のインデックスが相手の手なら自動実行、そうでなければユーザーのターン
        const isOpponentTurn = nextIndex % 2 === 1
        if (isOpponentTurn) {
          // ユーザーの手適用後の盤面状態を渡す（Reactの非同期更新対策）
          executeOpponentMove(matchingVariations, nextIndex, newState)
        }
      }
    },
    [
      currentProblem,
      boardState,
      sequenceIndex,
      activeVariationIndices,
      clearSelection,
      executeOpponentMove,
    ]
  )

  // セルタップ処理
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      // 解答再生中・相手思考中は操作をブロック
      if (solutionPlayback.isPlaying || isOpponentThinking) return

      const targetPos = { row, col }
      const piece = boardState.board[row][col]

      // 持ち駒選択中の場合
      if (selectedCaptured) {
        // 打てる位置をタップした場合 → 駒打ちで正解判定
        const canDrop = possibleMoves.some((p) => p.row === row && p.col === col)
        if (canDrop) {
          const dropMove: SequenceMove = {
            type: 'drop',
            to: targetPos,
            piece: selectedCaptured,
          }
          checkAnswer(dropMove)
          return
        }

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
            // 強制成りまたは成れない → 正解判定
            const moveAction: SequenceMove = {
              type: 'move',
              from: selectedPosition,
              to: targetPos,
              ...(promotions[0] && { promote: true }),
            }
            checkAnswer(moveAction)
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
      isOpponentThinking,
    ]
  )

  // 持ち駒タップ処理
  const handleCapturedPress = useCallback(
    (pieceType: PieceType) => {
      // 解答再生中・相手思考中は操作をブロック
      if (solutionPlayback.isPlaying || isOpponentThinking) return

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
    [boardState, selectedCaptured, clearSelection, solutionPlayback.isPlaying, isOpponentThinking]
  )

  // 成り選択処理
  const handlePromotionSelect = useCallback(
    (promote: boolean) => {
      if (pendingPromotion) {
        const moveAction: SequenceMove = {
          type: 'move',
          from: pendingPromotion.from,
          to: pendingPromotion.to,
          ...(promote && { promote: true }),
        }
        checkAnswer(moveAction)
        setPendingPromotion(null)
      }
    },
    [pendingPromotion, checkAnswer]
  )

  // やり直し
  const handleReset = useCallback(() => {
    if (!currentProblem) return

    // 相手の応手タイマーをキャンセル
    if (opponentTimerRef.current) {
      clearTimeout(opponentTimerRef.current)
      opponentTimerRef.current = null
    }

    solutionPlayback.reset()
    setBoardState(parseSfen(currentProblem.sfen))
    clearSelection()
    setHintHighlight(null)
    // シーケンスをリセット
    setSequenceIndex(0)
    setActiveVariationIndices(currentProblem.correctSequences.map((_, i) => i))
    setIsOpponentThinking(false)
  }, [currentProblem, clearSelection, solutionPlayback])

  // ヒント表示
  const handleHint = useCallback(() => {
    if (!currentProblem) return
    if (activeVariationIndices.length === 0) return

    // ヒント使用を記録
    setUsedHint(true)

    // 現在のシーケンス位置でのヒントを表示（最初のアクティブなバリエーションを使用）
    const firstVariation = currentProblem.correctSequences[activeVariationIndices[0]]
    if (sequenceIndex >= firstVariation.length) return

    const expectedMove = firstVariation[sequenceIndex]

    if (expectedMove.type === 'drop') {
      // 駒打ちの場合はto位置と駒種をハイライト
      setHintHighlight({
        from: undefined,
        to: expectedMove.to,
        piece: expectedMove.piece,
      })
    } else if (expectedMove.from) {
      // 移動の場合はfrom/toをハイライト
      setHintHighlight({
        from: expectedMove.from,
        to: expectedMove.to,
      })
    }
  }, [currentProblem, sequenceIndex, activeVariationIndices])

  // 解答表示
  const handleSolution = useCallback(() => {
    if (!currentProblem) return
    if (currentProblem.correctSequences.length === 0) return
    if (currentProblem.correctSequences[0].length === 0) return

    // 既に再生中なら何もしない
    if (solutionPlayback.phase !== 'none') {
      return
    }

    // 解答使用を記録（間違えとしてもカウント）
    setUsedSolution(true)
    setHasAttemptedWrong(true)

    // 最初のバリエーションの最初の手を取得
    // TODO: 現在は最初の手のみ表示。複数手順のシーケンス全体を
    // アニメーション再生する機能は未実装（useSolutionPlaybackの拡張が必要）
    const firstMove = currentProblem.correctSequences[0][0]

    // TODO: 駒打ちの解答再生アニメーションは未対応
    // useSolutionPlaybackが移動のみ対応のため、駒打ちの場合はヒント表示で代用
    if (firstMove.type === 'drop' || !firstMove.from) {
      setHintHighlight({
        from: undefined,
        to: firstMove.to,
        piece: firstMove.piece,
      })
      return
    }

    // 移動の場合はuseSolutionPlaybackを使用
    const correctMove = {
      from: firstMove.from,
      to: firstMove.to,
      promote: firstMove.promote,
    }

    solutionPlayback.play(
      {
        correctMove,
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
    isOpponentThinking,
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
      disabled: solutionPlayback.isPlaying || isOpponentThinking,
    },
    solutionPlayback,
  }
}
