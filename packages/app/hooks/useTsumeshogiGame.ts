/**
 * 詰将棋ゲームフック
 *
 * 独立した状態管理を行い、検証先行パターンで実装。
 * useShogiBoard は使用しない。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { parseSfen } from '@/lib/shogi/sfen'
import {
  getPossibleMoves,
  getDropPositions,
  makeMove,
  makeDrop,
  getPromotionOptions,
  applyMove,
} from '@/lib/shogi/moveGenerator'
import { isCheck, isCheckmate, getAllLegalMoves } from '@/lib/shogi/rules'
import { getPieceValue } from '@/lib/shogi/pieceValue'
import type { TsumeshogiProblem } from '@/mocks/tsumeshogiData'
import type { BoardState, Position, PieceType, Move } from '@/lib/shogi/types'

/** コールバック */
interface TsumeshogiCallbacks {
  /** 正解時 */
  onCorrect?: () => void
  /** 不正解時 */
  onIncorrect?: () => void
  /** 王手でない手を指した時 */
  onNotCheck?: () => void
}

/** 最後に指された手（ハイライト用） */
interface LastMoveHighlight {
  from?: Position  // 移動元（打ち駒の場合はなし）
  to: Position     // 移動先
}

/** ヒントのハイライト情報 */
interface HintHighlight {
  from?: Position  // 移動元（打ち駒の場合はなし）
  to: Position     // 移動先
  piece?: string   // 打ち駒の場合の駒種
}

/** タイミング定数 */
const AI_RESPONSE_DELAY_MS = 800
const FEEDBACK_DELAY_MS = 500
const SOLUTION_STEP_DELAY_MS = 1000

/** フックの戻り値 */
interface UseTsumeshogiGameReturn {
  /** 盤面状態 */
  boardState: BoardState
  /** 選択中の盤上位置 */
  selectedPosition: Position | null
  /** 選択中の持ち駒 */
  selectedCaptured: PieceType | null
  /** 移動可能なマス一覧 */
  possibleMoves: Position[]
  /** 成り選択が必要か */
  pendingPromotion: { from: Position; to: Position } | null
  /** 現在の手数 */
  currentMoveCount: number
  /** 相手思考中フラグ */
  isThinking: boolean
  /** ゲーム終了フラグ（正解・不正解後） */
  isFinished: boolean
  /** 最後に指された手（ハイライト用） */
  lastMove: LastMoveHighlight | null
  /** ヒントのハイライト */
  hintHighlight: HintHighlight | null
  /** 解答再生中フラグ */
  isSolutionMode: boolean
  /** セルタップ処理 */
  handleCellPress: (row: number, col: number) => void
  /** 持ち駒タップ処理 */
  handleCapturedPress: (pieceType: PieceType) => void
  /** 成り選択完了 */
  handlePromotionSelect: (promote: boolean) => void
  /** やり直し */
  reset: () => void
  /** ヒント表示 */
  showHint: () => void
  /** 解答再生 */
  playSolution: () => void
}

/**
 * 手のスコアを計算（AI応手の優先順位）
 * 詰将棋専用ロジック
 */
function getMoveScore(boardState: BoardState, move: Move): number {
  if (move.type === 'move') {
    const piece = boardState.board[move.from.row][move.from.col]

    // 1. 玉の移動は最優先（逃げ）
    if (piece?.type === 'ou') return 1000

    // 2. 攻め駒を取る
    const target = boardState.board[move.to.row][move.to.col]
    if (target) return 500 + getPieceValue(target.type)

    // 3. 合駒（ブロック）
    return 100
  }

  // 持ち駒での合駒は低優先
  return 50
}

/**
 * 最善の応手を選択（AI用）
 * 後手（gote）の視点で最善手を返す
 * 詰将棋専用ロジック
 */
function getBestEvasion(boardState: BoardState): Move | null {
  const legalMoves = getAllLegalMoves(boardState, 'gote')

  if (legalMoves.length === 0) return null

  // 優先順位でソート（降順）
  const sorted = [...legalMoves].sort((a, b) => {
    return getMoveScore(boardState, b) - getMoveScore(boardState, a)
  })

  return sorted[0]
}

/**
 * 詰将棋ゲームフック
 */
export function useTsumeshogiGame(
  problem: TsumeshogiProblem,
  callbacks?: TsumeshogiCallbacks,
): UseTsumeshogiGameReturn {
  // 初期盤面をパース（メモ化）
  const initialState = useMemo(() => parseSfen(problem.sfen), [problem.sfen])

  // タイマーIDの参照（クリーンアップ用）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 盤面状態
  const [boardState, setBoardState] = useState<BoardState>(initialState)
  // 選択中の盤上位置
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  // 選択中の持ち駒
  const [selectedCaptured, setSelectedCaptured] = useState<PieceType | null>(null)
  // 移動可能なマス一覧
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])
  // 成り選択待ち
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(null)
  // 手数カウント
  const [currentMoveCount, setCurrentMoveCount] = useState(1)
  // 相手思考中フラグ
  const [isThinking, setIsThinking] = useState(false)
  // ゲーム終了フラグ（正解・不正解後）
  const [isFinished, setIsFinished] = useState(false)
  // 最後に指された手（ハイライト用）
  const [lastMove, setLastMove] = useState<LastMoveHighlight | null>(null)
  // ヒントのハイライト
  const [hintHighlight, setHintHighlight] = useState<HintHighlight | null>(null)
  // 解答再生中フラグ
  const [isSolutionMode, setIsSolutionMode] = useState(false)

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedPosition(null)
    setSelectedCaptured(null)
    setPossibleMoves([])
  }, [])

  // タイマークリーンアップ
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  // やり直し
  const reset = useCallback(() => {
    clearTimer()
    setBoardState(initialState)
    clearSelection()
    setPendingPromotion(null)
    setCurrentMoveCount(1)
    setIsThinking(false)
    setIsFinished(false)
    setLastMove(null)
    setHintHighlight(null)
    setIsSolutionMode(false)
  }, [initialState, clearSelection, clearTimer])

  // ヒント表示
  const showHint = useCallback(() => {
    if (isFinished || isThinking || isSolutionMode) return
    if (!problem.hint) return

    // 初手のみヒントを表示（2手目以降はヒントなし）
    if (currentMoveCount !== 1) return

    setHintHighlight({
      from: problem.hint.from,
      to: problem.hint.to,
      piece: problem.hint.piece,
    })
  }, [isFinished, isThinking, isSolutionMode, problem.hint, currentMoveCount])

  // 解答再生
  const playSolution = useCallback(() => {
    if (!problem.solutionMoves || problem.solutionMoves.length === 0) return
    if (isSolutionMode) return

    // 盤面を初期状態にリセット
    clearTimer()
    setBoardState(initialState)
    clearSelection()
    setPendingPromotion(null)
    setCurrentMoveCount(1)
    setIsThinking(false)
    setIsFinished(false)
    setLastMove(null)
    setHintHighlight(null)
    setIsSolutionMode(true)

    // 解答を1手ずつ再生
    let currentState = initialState
    let stepIndex = 0
    const solutionMoves = problem.solutionMoves

    const playNextMove = () => {
      if (stepIndex >= solutionMoves.length) {
        // 全手順完了
        setIsSolutionMode(false)
        setIsFinished(true)
        return
      }

      const move = solutionMoves[stepIndex]
      const player = stepIndex % 2 === 0 ? 'sente' : 'gote'

      // 手を適用
      if (move.piece) {
        // 打ち駒
        currentState = makeDrop(currentState, move.piece as PieceType, move.to, player)
        setLastMove({ to: move.to })
      } else if (move.from) {
        // 盤上の駒を移動
        currentState = makeMove(currentState, move.from, move.to, move.promote ?? false)
        setLastMove({ from: move.from, to: move.to })
      }

      setBoardState(currentState)
      setCurrentMoveCount(stepIndex + 1)
      stepIndex++

      // 次の手を再生
      timerRef.current = setTimeout(playNextMove, SOLUTION_STEP_DELAY_MS)
    }

    // 最初の手を少し遅延して開始
    timerRef.current = setTimeout(playNextMove, 500)
  }, [problem.solutionMoves, isSolutionMode, initialState, clearTimer, clearSelection])

  // AI応手を実行する共通処理
  const executeAIResponse = useCallback(
    (state: BoardState, onComplete?: () => void) => {
      const evasion = getBestEvasion(state)
      if (evasion) {
        const afterAI = applyMove(state, evasion)
        setBoardState(afterAI)
        // AI の手をハイライト
        if (evasion.type === 'move') {
          setLastMove({ from: evasion.from, to: evasion.to })
        } else {
          setLastMove({ to: evasion.to })
        }
      }
      setIsThinking(false)
      onComplete?.()
    },
    [],
  )

  // 手を実行して結果を処理
  const executeMove = useCallback(
    (newState: BoardState, moveHighlight: LastMoveHighlight) => {
      // ヒントをクリア
      setHintHighlight(null)

      // 1. 王手チェック
      if (!isCheck(newState.board, 'gote')) {
        // 王手でない → アラートを出して手を戻す（不正解カウントはしない）
        callbacks?.onNotCheck?.()
        return
      }

      // ユーザーの手をハイライト
      setLastMove(moveHighlight)

      // 2. 詰みチェック
      if (isCheckmate(newState, 'gote')) {
        // 詰み → 正解！
        setBoardState(newState)
        setCurrentMoveCount((prev) => prev + 1)
        clearSelection()
        setIsFinished(true)
        callbacks?.onCorrect?.()
        return
      }

      // 3. 最終手で詰まなかった場合
      if (currentMoveCount >= problem.moves) {
        // 規定手数の最終手だが詰みではない
        // 盤面を更新して相手の手を見せてから不正解にする
        setBoardState(newState)
        setCurrentMoveCount((prev) => prev + 1)
        clearSelection()
        setIsThinking(true)

        timerRef.current = setTimeout(() => {
          executeAIResponse(newState, () => {
            setIsFinished(true)
            // 相手の手を見せてから不正解
            timerRef.current = setTimeout(() => {
              callbacks?.onIncorrect?.()
            }, FEEDBACK_DELAY_MS)
          })
        }, AI_RESPONSE_DELAY_MS)
        return
      }

      // 4. AI応手（まだ手数が残っている場合）
      setBoardState(newState)
      setCurrentMoveCount((prev) => prev + 1)
      clearSelection()
      setIsThinking(true)

      // 少し遅延してAI応手を実行（UIの更新を見せるため）
      timerRef.current = setTimeout(() => {
        executeAIResponse(newState, () => {
          setCurrentMoveCount((prev) => prev + 1)
        })
      }, AI_RESPONSE_DELAY_MS)
    },
    [callbacks, clearSelection, currentMoveCount, problem.moves, executeAIResponse],
  )

  // 成り選択完了
  const handlePromotionSelect = useCallback(
    (promote: boolean) => {
      if (!pendingPromotion) return

      const { from, to } = pendingPromotion
      setPendingPromotion(null)

      const newState = makeMove(boardState, from, to, promote)
      executeMove(newState, { from, to })
    },
    [pendingPromotion, boardState, executeMove],
  )

  // セルタップ処理
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (isThinking || isFinished || isSolutionMode) return

      const targetPos = { row, col }
      const piece = boardState.board[row][col]

      // 持ち駒選択中の場合
      if (selectedCaptured) {
        // 空きマスなら打つ
        if (!piece) {
          const dropPositions = getDropPositions(boardState.board, selectedCaptured, 'sente')
          const canDrop = dropPositions.some((p) => p.row === row && p.col === col)

          if (canDrop) {
            const newState = makeDrop(boardState, selectedCaptured, targetPos, 'sente')
            clearSelection()
            executeMove(newState, { to: targetPos })
          } else {
            clearSelection()
          }
        } else if (piece.owner === 'sente') {
          // 自分の駒を選択
          clearSelection()
          setSelectedPosition(targetPos)
          const moves = getPossibleMoves(boardState.board, targetPos, piece)
          setPossibleMoves(moves)
        } else {
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
          const promotions = getPromotionOptions(selectedPiece.type, selectedPosition, targetPos, 'sente')

          if (promotions.length === 2) {
            // 成り/不成り選択が必要
            setPendingPromotion({ from: selectedPosition, to: targetPos })
            clearSelection()
          } else {
            // 強制成りまたは成れない
            const from = selectedPosition
            clearSelection()
            const newState = makeMove(boardState, from, targetPos, promotions[0])
            executeMove(newState, { from, to: targetPos })
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
    [boardState, selectedPosition, selectedCaptured, possibleMoves, isThinking, isFinished, isSolutionMode, clearSelection, executeMove],
  )

  // 持ち駒タップ処理
  const handleCapturedPress = useCallback(
    (pieceType: PieceType) => {
      if (isThinking || isFinished || isSolutionMode) return

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
    [boardState, selectedCaptured, isThinking, isFinished, isSolutionMode, clearSelection],
  )

  return {
    boardState,
    selectedPosition,
    selectedCaptured,
    possibleMoves,
    pendingPromotion,
    currentMoveCount,
    isThinking,
    isFinished,
    lastMove,
    hintHighlight,
    isSolutionMode,
    handleCellPress,
    handleCapturedPress,
    handlePromotionSelect,
    reset,
    showHint,
    playSolution,
  }
}
