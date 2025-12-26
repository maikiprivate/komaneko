/**
 * 問題編集ページ（3パネルレイアウト）
 *
 * - 左パネル: 盤面エディタ（駒パレット + 将棋盤 + 指示文 + モード切替）
 * - 中央パネル: 手順ツリー
 * - 右パネル: 問題リスト
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShogiBoardWithStands } from '../../components/shogi/ShogiBoardWithStands'
import { parseSfen, boardStateToSfen, EMPTY_BOARD_SFEN } from '../../lib/shogi/sfen'
import type { EditorMode, MoveTree, BranchPath } from '../../lib/lesson/types'
import {
  getCourses,
  updateProblem as apiUpdateProblem,
  createProblem as apiCreateProblem,
  deleteProblem as apiDeleteProblem,
  reorderProblems as apiReorderProblems,
  type ApiCourse,
  type ApiProblem,
} from '../../api/lesson'
import type { PieceType, Player, Position } from '../../lib/shogi/types'
import { HAND_PIECE_TYPES } from '../../lib/shogi/types'
import { createEmptyBoardState } from '../../lib/shogi/sfen'
import { getPossibleMoves, getDropPositions, canPromote, mustPromote, makeMove, makeDrop } from '../../lib/shogi/moveGenerator'
import {
  positionToSfenMove,
  dropToSfenMove,
  createEmptyMoveTree,
  addMoveAtPath,
  createDefaultPath,
  truncatePathToIndex,
  switchBranchAtPath,
  replayMoveTreeWithPath,
  serializeMoveTree,
  deserializeMoveTree,
} from '../../lib/lesson/moveTreeUtils'

// =============================================================================
// UI用の型定義
// =============================================================================

/** UI用の問題型 */
interface UiProblem {
  id: string
  order: number
  sfen: string
  playerTurn: 'black' | 'white'
  instruction: string
  moveTree?: MoveTree
  /** 新規作成の問題かどうか（APIに未保存） */
  isNew?: boolean
}

/** レッスンデータ（API取得結果を変換） */
interface LessonData {
  courseTitle: string
  sectionTitle: string
  lessonId: string
  lessonTitle: string
}

/** API問題をUI問題に変換 */
function toUiProblem(apiProblem: ApiProblem): UiProblem {
  const moveTree = apiProblem.moveTree && apiProblem.moveTree.length > 0
    ? deserializeMoveTree(apiProblem.moveTree, apiProblem.sfen)
    : undefined
  return {
    id: apiProblem.id,
    order: apiProblem.order,
    sfen: apiProblem.sfen,
    playerTurn: apiProblem.playerTurn,
    instruction: apiProblem.instruction ?? '',
    moveTree,
  }
}

/** 全コースからレッスンを検索 */
function findLessonFromCourses(
  courses: ApiCourse[],
  lessonId: string
): { lessonData: LessonData; problems: UiProblem[] } | undefined {
  for (const course of courses) {
    for (const section of course.sections) {
      const lesson = section.lessons.find((l) => l.id === lessonId)
      if (lesson) {
        return {
          lessonData: {
            courseTitle: course.title,
            sectionTitle: section.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          },
          problems: lesson.problems.map(toUiProblem),
        }
      }
    }
  }
  return undefined
}
import {
  EditorHeader,
  EditorPanel,
  MoveTreePanel,
  ProblemListPanel,
  PromotionDialog,
  type SaveStatus,
} from '../../components/lesson'

// =============================================================================
// メインコンポーネント
// =============================================================================

export function ProblemEdit() {
  const { lessonId } = useParams<{ lessonId: string }>()

  // データ取得状態
  const [lessonData, setLessonData] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 状態
  const [mode, setMode] = useState<EditorMode>('setup')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [problems, setProblems] = useState<UiProblem[]>([])
  const [deletedProblemIds, setDeletedProblemIds] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // 初回データ取得
  useEffect(() => {
    if (!lessonId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const courses = await getCourses()
        const result = findLessonFromCourses(courses, lessonId)
        if (result) {
          setLessonData(result.lessonData)
          setProblems(result.problems)
        } else {
          setError('レッスンが見つかりません')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [lessonId])

  // 駒パレット状態（初期配置モード用）
  const [selectedPalettePiece, setSelectedPalettePiece] = useState<PieceType | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<Player>('sente')

  // 手順設定モード用状態
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedHandPiece, setSelectedHandPiece] = useState<PieceType | null>(null)
  const [selectedHandPieceOwner, setSelectedHandPieceOwner] = useState<Player>('sente')
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Position
    to: Position
    pieceType: PieceType
  } | null>(null)
  // 分岐対応: ツリー全体とパスで状態管理
  const [fullMoveTree, setFullMoveTree] = useState<MoveTree | null>(null)
  const [currentPath, setCurrentPath] = useState<BranchPath[]>([])
  const [currentTurn, setCurrentTurn] = useState<Player>('sente')
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(-1) // -1 = 初期局面

  // 現在選択中の問題
  const selectedProblem = problems[selectedIndex]

  // 初期盤面状態（問題のSFENから）
  // 依存配列を明確にするため、sfenを先に取得
  const selectedSfen = selectedProblem?.sfen
  const initialBoardState = useMemo(() => {
    if (!selectedSfen) return createEmptyBoardState()
    return parseSfen(selectedSfen)
  }, [selectedSfen])

  // 現在のパス上のノード（盤面状態付き）を導出
  const currentPathNodes = useMemo(() => {
    if (!fullMoveTree || currentPath.length === 0) {
      return []
    }
    return replayMoveTreeWithPath(fullMoveTree, currentPath)
  }, [fullMoveTree, currentPath])

  // 手順設定モード用の現在盤面
  const [moveModeBoardState, setMoveModeBoardState] = useState(initialBoardState)

  // モードに応じて使用する盤面を選択
  const boardState = mode === 'moves' ? moveModeBoardState : initialBoardState

  // モード切り替え時は選択状態のみリセット（手順は保持）
  useEffect(() => {
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [mode])

  // 問題切り替え時に盤面と手順を復元
  useEffect(() => {
    // 盤面をリセット
    setMoveModeBoardState(initialBoardState)
    setCurrentTurn('sente')
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
    setSelectedNodeIndex(-1)

    // MoveTreeがあれば復元
    if (selectedProblem?.moveTree && selectedProblem.moveTree.branches.length > 0) {
      setFullMoveTree(selectedProblem.moveTree)
      const defaultPath = createDefaultPath(selectedProblem.moveTree)
      setCurrentPath(defaultPath)

      // パスに沿って手順を再生し、最後の局面を復元
      const restoredNodes = replayMoveTreeWithPath(selectedProblem.moveTree, defaultPath)
      if (restoredNodes.length > 0) {
        const lastNode = restoredNodes[restoredNodes.length - 1]
        setMoveModeBoardState(lastNode.boardState)
        setCurrentTurn(lastNode.isPlayerMove ? 'gote' : 'sente')
        setSelectedNodeIndex(restoredNodes.length - 1)
      }
    } else {
      // 空のツリーを初期化
      const emptyTree = selectedSfen ? createEmptyMoveTree(selectedSfen) : null
      setFullMoveTree(emptyTree)
      setCurrentPath([])
    }
  }, [initialBoardState, selectedProblem?.moveTree, selectedSfen])

  // 指示文変更
  const handleInstructionChange = useCallback((value: string) => {
    if (!selectedProblem) return
    const newProblems = [...problems]
    newProblems[selectedIndex] = { ...selectedProblem, instruction: value }
    setProblems(newProblems)
  }, [problems, selectedIndex, selectedProblem])

  // 問題選択（選択前に現在のmoveTreeを保存）
  const handleProblemSelect = useCallback((newIndex: number) => {
    if (newIndex === selectedIndex) return

    // 現在の問題にMoveTreeを保存
    if (fullMoveTree && fullMoveTree.branches.length > 0) {
      const newProblems = [...problems]
      newProblems[selectedIndex] = { ...problems[selectedIndex], moveTree: fullMoveTree }
      setProblems(newProblems)
    }

    setSelectedIndex(newIndex)
  }, [selectedIndex, fullMoveTree, problems])

  // 問題追加
  const handleAddProblem = useCallback(() => {
    const newProblem: UiProblem = {
      id: `new-${Date.now()}`,
      order: problems.length + 1,
      sfen: EMPTY_BOARD_SFEN,
      playerTurn: 'black',
      instruction: '',
      isNew: true,
    }
    setProblems([...problems, newProblem])
    setSelectedIndex(problems.length)
  }, [problems])

  // 問題削除
  const handleDeleteProblem = useCallback((index: number) => {
    if (problems.length <= 1) return
    const problemToDelete = problems[index]
    // 新規作成でない問題は削除対象として追跡
    if (!problemToDelete.isNew) {
      setDeletedProblemIds((prev) => [...prev, problemToDelete.id])
    }
    const newProblems = problems.filter((_, i) => i !== index)
    setProblems(newProblems)
    if (selectedIndex >= newProblems.length) {
      setSelectedIndex(newProblems.length - 1)
    }
  }, [problems, selectedIndex])

  // 問題並び替え
  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return
    const newProblems = [...problems]
    ;[newProblems[index - 1], newProblems[index]] = [newProblems[index], newProblems[index - 1]]
    setProblems(newProblems)
    setSelectedIndex(index - 1)
  }, [problems])

  const handleMoveDown = useCallback((index: number) => {
    if (index >= problems.length - 1) return
    const newProblems = [...problems]
    ;[newProblems[index], newProblems[index + 1]] = [newProblems[index + 1], newProblems[index]]
    setProblems(newProblems)
    setSelectedIndex(index + 1)
  }, [problems])

  // 保存
  const handleSave = useCallback(async () => {
    if (!lessonId) return

    setSaveStatus('saving')
    try {
      // 削除対象の問題をAPI経由で削除
      for (const id of deletedProblemIds) {
        await apiDeleteProblem(id)
      }

      // 現在の問題にMoveTreeを反映
      const updatedProblems = problems.map((p, i) => {
        if (i === selectedIndex && fullMoveTree) {
          return { ...p, moveTree: fullMoveTree }
        }
        return p
      })

      // 各問題をAPIで保存
      const savedProblems: UiProblem[] = []
      for (const problem of updatedProblems) {
        const moveTreeData = problem.moveTree
          ? serializeMoveTree(problem.moveTree)
          : []

        if (problem.isNew) {
          // 新規作成
          const created = await apiCreateProblem({
            sfen: problem.sfen,
            playerTurn: problem.playerTurn,
            moveTree: moveTreeData,
            instruction: problem.instruction,
            lessonId,
          })
          savedProblems.push(toUiProblem(created))
        } else {
          // 更新
          const updated = await apiUpdateProblem(problem.id, {
            sfen: problem.sfen,
            playerTurn: problem.playerTurn,
            moveTree: moveTreeData,
            instruction: problem.instruction,
          })
          savedProblems.push(toUiProblem(updated))
        }
      }

      // 並び順を更新
      const orderedIds = savedProblems.map((p) => p.id)
      await apiReorderProblems(lessonId, orderedIds)

      // 保存結果を反映
      setProblems(savedProblems)
      setDeletedProblemIds([]) // 削除リストをクリア

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      console.error('Failed to save problems:', err)
      setSaveStatus('error')
      alert(`保存に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [lessonId, problems, selectedIndex, fullMoveTree, deletedProblemIds])

  // 駒パレット選択
  const handlePaletteSelect = useCallback((piece: PieceType | null, owner: Player) => {
    setSelectedPalettePiece(piece)
    setSelectedOwner(owner)
  }, [])

  // 盤面セルクリック（初期配置モード）
  const handleSetupCellClick = useCallback((row: number, col: number) => {
    // 問題がない場合は自動で新規作成
    if (!selectedProblem) {
      handleAddProblem()
      return
    }

    const currentBoard = parseSfen(selectedProblem.sfen)
    const newBoard = currentBoard.board.map((r) => [...r])
    const currentCell = newBoard[row][col]

    if (selectedPalettePiece) {
      // 駒を配置
      newBoard[row][col] = {
        type: selectedPalettePiece,
        owner: selectedOwner,
      }
    } else if (currentCell) {
      // 駒を削除
      newBoard[row][col] = null
    } else {
      // 何もしない
      return
    }

    // 新しいSFENを生成して問題を更新
    const newBoardState = {
      ...currentBoard,
      board: newBoard,
    }
    const newSfen = boardStateToSfen(newBoardState)

    const newProblems = [...problems]
    newProblems[selectedIndex] = { ...selectedProblem, sfen: newSfen }
    setProblems(newProblems)
  }, [selectedProblem, selectedPalettePiece, selectedOwner, problems, selectedIndex, handleAddProblem])

  // 手をツリーに追加する共通処理（分岐対応版）
  const addMoveToTreeNew = useCallback((sfenMove: string, newBoardState: import('../../lib/shogi/types').BoardState, isPlayerMove: boolean) => {
    if (!fullMoveTree || !selectedSfen) return

    // 現在のパスを選択ノードまで切り詰める
    const truncatedPath = selectedNodeIndex >= 0
      ? truncatePathToIndex(currentPath, selectedNodeIndex)
      : []

    // 新しい手を追加
    const { tree: newTree, path: newPath } = addMoveAtPath(
      fullMoveTree,
      truncatedPath,
      sfenMove,
      isPlayerMove
    )

    // 状態を更新
    setFullMoveTree(newTree)
    setCurrentPath(newPath)
    setSelectedNodeIndex(newPath.length - 1)
    setMoveModeBoardState(newBoardState)
    setCurrentTurn(prev => prev === 'sente' ? 'gote' : 'sente')
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [fullMoveTree, currentPath, selectedNodeIndex, selectedSfen])

  // 手を実行（盤上の移動）
  const executeMove = useCallback((from: Position, to: Position, promote: boolean) => {
    const newBoardState = makeMove(moveModeBoardState, from, to, promote)
    if (!newBoardState) return

    const sfenMove = positionToSfenMove(from, to, promote)
    const isPlayerMove = currentTurn === 'sente'
    addMoveToTreeNew(sfenMove, newBoardState, isPlayerMove)
  }, [currentTurn, moveModeBoardState, addMoveToTreeNew])

  // 駒を打つ
  const executeDrop = useCallback((pieceType: PieceType, to: Position) => {
    // 手番に基づいて駒を打つ（selectedHandPieceOwnerではなくcurrentTurnを使用）
    const newBoardState = makeDrop(moveModeBoardState, pieceType, to, currentTurn)
    if (!newBoardState) return

    const sfenMove = dropToSfenMove(pieceType, to)
    const isPlayerMove = currentTurn === 'sente'
    addMoveToTreeNew(sfenMove, newBoardState, isPlayerMove)
  }, [currentTurn, moveModeBoardState, addMoveToTreeNew])

  // 盤面セルクリック（手順設定モード）
  const handleMovesCellClick = useCallback((row: number, col: number) => {
    const clickedPos = { row, col }
    const piece = boardState.board[row][col]

    // 持ち駒が選択されていて、打てる位置の場合
    if (selectedHandPiece && possibleMoves.some(m => m.row === row && m.col === col)) {
      executeDrop(selectedHandPiece, clickedPos)
      return
    }

    // 移動先が選択されている場合
    if (selectedPosition && possibleMoves.some(m => m.row === row && m.col === col)) {
      const fromPiece = boardState.board[selectedPosition.row][selectedPosition.col]
      if (!fromPiece) return

      // 成り判定
      if (canPromote(fromPiece.type, selectedPosition, clickedPos, currentTurn)) {
        if (mustPromote(fromPiece.type, clickedPos, currentTurn)) {
          // 強制成り
          executeMove(selectedPosition, clickedPos, true)
        } else {
          // 成り選択ダイアログ表示
          setPendingPromotion({
            from: selectedPosition,
            to: clickedPos,
            pieceType: fromPiece.type,
          })
        }
      } else {
        // 成れない
        executeMove(selectedPosition, clickedPos, false)
      }
      return
    }

    // 自分の駒をクリックした場合：選択して合法手を表示
    if (piece && piece.owner === currentTurn) {
      const moves = getPossibleMoves(boardState.board, clickedPos, piece)
      setSelectedPosition(clickedPos)
      setSelectedHandPiece(null)
      setPossibleMoves(moves)
      return
    }

    // それ以外：選択解除
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [boardState, selectedPosition, selectedHandPiece, possibleMoves, currentTurn, executeMove, executeDrop])

  // 成り選択
  const handlePromotionChoice = useCallback((promote: boolean) => {
    if (!pendingPromotion) return
    executeMove(pendingPromotion.from, pendingPromotion.to, promote)
    setPendingPromotion(null)
  }, [pendingPromotion, executeMove])

  // 手順クリア
  const handleMoveTreeClear = useCallback(() => {
    setMoveModeBoardState(initialBoardState)
    // ツリーをリセット（空のツリーに戻す）
    if (selectedSfen) {
      setFullMoveTree(createEmptyMoveTree(selectedSfen))
    }
    setCurrentPath([])
    setCurrentTurn('sente')
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
    setSelectedNodeIndex(-1)
  }, [initialBoardState, selectedSfen])

  // ノードクリック（局面を復元）
  const handleNodeClick = useCallback((index: number) => {
    if (index === -1) {
      // 初期局面に戻る
      setMoveModeBoardState(initialBoardState)
      setCurrentTurn('sente')
    } else {
      // 指定されたノードの局面を復元
      const node = currentPathNodes[index]
      if (node) {
        setMoveModeBoardState(node.boardState)
        // 次の手番はこの手を指したプレイヤーの相手
        setCurrentTurn(node.isPlayerMove ? 'gote' : 'sente')
      }
    }
    setSelectedNodeIndex(index)
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [initialBoardState, currentPathNodes])

  // 分岐切り替え
  const handleBranchSwitch = useCallback((nodeIndex: number, newBranchIndex: number) => {
    if (!fullMoveTree) return

    // 新しいパスを生成
    const newPath = switchBranchAtPath(fullMoveTree, currentPath, nodeIndex, newBranchIndex)
    setCurrentPath(newPath)

    // パスに沿って手順を再生し、最後の局面を復元
    const newNodes = replayMoveTreeWithPath(fullMoveTree, newPath)
    if (newNodes.length > 0) {
      const lastNode = newNodes[newNodes.length - 1]
      setMoveModeBoardState(lastNode.boardState)
      setCurrentTurn(lastNode.isPlayerMove ? 'gote' : 'sente')
      setSelectedNodeIndex(newNodes.length - 1)
    } else {
      setMoveModeBoardState(initialBoardState)
      setCurrentTurn('sente')
      setSelectedNodeIndex(-1)
    }

    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [fullMoveTree, currentPath, initialBoardState])

  // 持ち駒クリック（手順設定モード：駒を打つために選択）
  const handleMovesHandPieceClick = useCallback((pieceType: PieceType, owner: Player) => {
    // 手番のプレイヤーでなければ無視
    if (owner !== currentTurn) return

    // 既に選択中の駒を再クリックした場合は解除
    if (selectedHandPiece === pieceType && selectedHandPieceOwner === owner) {
      setSelectedHandPiece(null)
      setPossibleMoves([])
      return
    }

    // 持ち駒を持っているか確認
    const handPieces = boardState.capturedPieces[owner]
    if (!handPieces[pieceType] || handPieces[pieceType] === 0) return

    // 打てる場所を計算
    const dropPositions = getDropPositions(boardState.board, pieceType, owner)

    setSelectedPosition(null)
    setSelectedHandPiece(pieceType)
    setSelectedHandPieceOwner(owner)
    setPossibleMoves(dropPositions)
  }, [selectedHandPiece, selectedHandPieceOwner, boardState, currentTurn])

  // 先手持ち駒クリック
  const handleSenteHandPieceClick = useCallback((pieceType: PieceType) => {
    handleMovesHandPieceClick(pieceType, 'sente')
  }, [handleMovesHandPieceClick])

  // 後手持ち駒クリック
  const handleGoteHandPieceClick = useCallback((pieceType: PieceType) => {
    handleMovesHandPieceClick(pieceType, 'gote')
  }, [handleMovesHandPieceClick])

  // 統合クリックハンドラ
  const handleCellClick = useCallback((row: number, col: number) => {
    if (mode === 'setup') {
      handleSetupCellClick(row, col)
    } else {
      handleMovesCellClick(row, col)
    }
  }, [mode, handleSetupCellClick, handleMovesCellClick])

  // 盤面リセット
  const handleBoardReset = useCallback(() => {
    if (!selectedProblem) return
    const newProblems = [...problems]
    newProblems[selectedIndex] = { ...selectedProblem, sfen: EMPTY_BOARD_SFEN }
    setProblems(newProblems)
    setSelectedPalettePiece(null)
  }, [selectedProblem, problems, selectedIndex])

  // 駒台クリック（持ち駒追加）
  const handleStandClick = useCallback((player: Player) => {
    if (mode !== 'setup' || !selectedProblem || !selectedPalettePiece) return

    // 成駒は持ち駒にできない
    if (!HAND_PIECE_TYPES.includes(selectedPalettePiece)) return

    const currentBoard = parseSfen(selectedProblem.sfen)
    const newCapturedPieces = {
      sente: { ...currentBoard.capturedPieces.sente },
      gote: { ...currentBoard.capturedPieces.gote },
    }

    // 持ち駒を追加
    const currentCount = newCapturedPieces[player][selectedPalettePiece] ?? 0
    newCapturedPieces[player][selectedPalettePiece] = currentCount + 1

    const newBoardState = {
      ...currentBoard,
      capturedPieces: newCapturedPieces,
    }
    const newSfen = boardStateToSfen(newBoardState)

    const newProblems = [...problems]
    newProblems[selectedIndex] = { ...selectedProblem, sfen: newSfen }
    setProblems(newProblems)
  }, [mode, selectedProblem, selectedPalettePiece, problems, selectedIndex])

  const handleSenteStandClick = useCallback(() => handleStandClick('sente'), [handleStandClick])
  const handleGoteStandClick = useCallback(() => handleStandClick('gote'), [handleStandClick])

  // 持ち駒クリック（削除）
  const handleHandPieceClick = useCallback((pieceType: PieceType) => {
    if (mode !== 'setup' || !selectedProblem) return

    const currentBoard = parseSfen(selectedProblem.sfen)
    const newCapturedPieces = {
      sente: { ...currentBoard.capturedPieces.sente },
      gote: { ...currentBoard.capturedPieces.gote },
    }

    // 先手の持ち駒から削除を試みる（先手駒台がクリック可能なので）
    const senteCount = newCapturedPieces.sente[pieceType] ?? 0
    if (senteCount > 0) {
      if (senteCount === 1) {
        delete newCapturedPieces.sente[pieceType]
      } else {
        newCapturedPieces.sente[pieceType] = senteCount - 1
      }

      const newBoardState = {
        ...currentBoard,
        capturedPieces: newCapturedPieces,
      }
      const newSfen = boardStateToSfen(newBoardState)

      const newProblems = [...problems]
      newProblems[selectedIndex] = { ...selectedProblem, sfen: newSfen }
      setProblems(newProblems)
    }
  }, [mode, selectedProblem, problems, selectedIndex])

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラーまたはレッスンが見つからない場合
  if (error || !lessonData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{error || 'レッスンが見つかりません'}</p>
          <Link to="/lessons" className="text-primary hover:text-primary-dark">
            レッスン一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* ヘッダー */}
      <EditorHeader
        lessonTitle={lessonData.lessonTitle}
        breadcrumb={`${lessonData.courseTitle} / ${lessonData.sectionTitle}`}
        onSave={handleSave}
        saveStatus={saveStatus}
      />

      {/* メインコンテンツ（3パネル） */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左パネル: 問題リスト（狭め） */}
        <div className="w-[200px] flex-shrink-0 bg-white border-r border-slate-200">
          <ProblemListPanel
            problems={problems}
            selectedIndex={selectedIndex}
            onSelect={handleProblemSelect}
            onAdd={handleAddProblem}
            onDelete={handleDeleteProblem}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        </div>

        {/* 中央パネル: 盤面エディタ（広め） */}
        <div className="flex-1 p-4 overflow-auto bg-slate-50">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* 編集パネル（モード + 駒パレット統合） */}
            <EditorPanel
              mode={mode}
              onModeChange={setMode}
              selectedPiece={selectedPalettePiece}
              selectedOwner={selectedOwner}
              onPieceSelect={handlePaletteSelect}
              onReset={handleBoardReset}
            />

            {/* 将棋盤 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex justify-center">
                <ShogiBoardWithStands
                  boardState={boardState}
                  perspective="sente"
                  cellSize={40}
                  onCellClick={handleCellClick}
                  onSenteStandClick={mode === 'setup' ? handleSenteStandClick : undefined}
                  onGoteStandClick={mode === 'setup' ? handleGoteStandClick : undefined}
                  onHandPieceClick={mode === 'setup' ? handleHandPieceClick : undefined}
                  onSenteHandPieceClick={mode === 'moves' ? handleSenteHandPieceClick : undefined}
                  onGoteHandPieceClick={mode === 'moves' ? handleGoteHandPieceClick : undefined}
                  selectedPosition={mode === 'moves' ? selectedPosition : undefined}
                  selectedHandPiece={mode === 'moves' && selectedHandPieceOwner === 'sente' ? selectedHandPiece : undefined}
                  selectedGoteHandPiece={mode === 'moves' && selectedHandPieceOwner === 'gote' ? selectedHandPiece : undefined}
                  possibleMoves={mode === 'moves' ? possibleMoves : undefined}
                />
              </div>
            </div>

            {/* 指示文 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                指示文
              </label>
              <input
                type="text"
                value={selectedProblem?.instruction ?? ''}
                onChange={(e) => handleInstructionChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="歩を前に進めてにゃ！"
              />
            </div>

            {/* SFEN表示（折りたたみ可） */}
            <details className="text-xs bg-white rounded-lg p-3 border border-slate-200">
              <summary className="text-slate-500 cursor-pointer hover:text-slate-700">
                SFEN（デバッグ用）
              </summary>
              <code className="block mt-2 p-2 bg-slate-100 rounded text-slate-600 break-all">
                {selectedProblem?.sfen ?? '(なし)'}
              </code>
            </details>
          </div>
        </div>

        {/* 右パネル: 手順ツリー */}
        <div className="w-[260px] flex-shrink-0 bg-white border-l border-slate-200">
          <MoveTreePanel
            nodes={currentPathNodes}
            currentTurn={currentTurn}
            selectedNodeIndex={selectedNodeIndex}
            onNodeClick={handleNodeClick}
            onClear={handleMoveTreeClear}
            fullMoveTree={fullMoveTree}
            currentPath={currentPath}
            onBranchSwitch={handleBranchSwitch}
          />
        </div>
      </div>

      {/* 成り確認ダイアログ */}
      {pendingPromotion && (
        <PromotionDialog
          pieceType={pendingPromotion.pieceType}
          onChoice={handlePromotionChoice}
        />
      )}
    </div>
  )
}
