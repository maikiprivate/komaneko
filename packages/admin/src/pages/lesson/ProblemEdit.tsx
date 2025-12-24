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
import { parseSfen, boardStateToSfen } from '../../lib/shogi/sfen'
import { getLessonById, type Problem } from '../../mocks/lessonData'
import type { EditorMode } from '../../lib/lesson/types'
import type { PieceType, Player, Position } from '../../lib/shogi/types'
import { HAND_PIECE_TYPES } from '../../lib/shogi/types'
import { createEmptyBoardState } from '../../lib/shogi/sfen'
import { getPossibleMoves, getDropPositions, canPromote, mustPromote, makeMove, makeDrop } from '../../lib/shogi/moveGenerator'
import type { MoveNode } from '../../lib/lesson/types'
import { createMoveNode, positionToSfenMove, dropToSfenMove } from '../../lib/lesson/moveTreeUtils'

// =============================================================================
// エディタヘッダー
// =============================================================================

function EditorHeader({
  lessonTitle,
  breadcrumb,
  onSave,
}: {
  lessonTitle: string
  breadcrumb: string
  onSave: () => void
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-4">
        <Link
          to="/lessons"
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">戻る</span>
        </Link>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{lessonTitle}</h1>
          <p className="text-xs text-slate-400">{breadcrumb}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          プレビュー
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// 編集パネル（モード切替 + 駒パレット統合）
// =============================================================================

/** 通常駒 */
const NORMAL_PIECES: PieceType[] = [
  'ou', 'hi', 'kaku', 'kin', 'gin', 'kei', 'kyo', 'fu',
]

/** 成駒 */
const PROMOTED_PIECES: PieceType[] = [
  'ryu', 'uma', 'narigin', 'narikei', 'narikyo', 'to',
]

function EditorPanel({
  mode,
  onModeChange,
  selectedPiece,
  selectedOwner,
  onPieceSelect,
  onReset,
}: {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  selectedPiece: PieceType | null
  selectedOwner: Player
  onPieceSelect: (piece: PieceType | null, owner: Player) => void
  onReset: () => void
}) {
  const isSelected = (piece: PieceType, owner: Player) =>
    selectedPiece === piece && selectedOwner === owner

  const renderPieceButton = (piece: PieceType, owner: Player) => (
    <button
      key={`${owner}-${piece}`}
      onClick={() => onPieceSelect(isSelected(piece, owner) ? null : piece, owner)}
      className={`w-8 h-8 rounded border-2 transition-all flex items-center justify-center ${
        isSelected(piece, owner)
          ? 'border-primary bg-primary/10'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
      title={`${owner === 'sente' ? '先手' : '後手'}${piece}`}
    >
      <img
        src={`/pieces/${piece}.png`}
        alt={piece}
        className={`w-5 h-5 ${owner === 'gote' ? 'rotate-180' : ''}`}
      />
    </button>
  )

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
      {/* モード切り替えタブ */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => onModeChange('setup')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'setup'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            初期配置
          </button>
          <button
            onClick={() => onModeChange('moves')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'moves'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            手順設定
          </button>
        </div>
      </div>

      {/* 初期配置モード時のみ駒パレット表示 */}
      {mode === 'setup' && (
        <>
          {/* 1行目: 通常駒（先手 + 後手） */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-0.5">
              {NORMAL_PIECES.map((piece) => renderPieceButton(piece, 'sente'))}
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-0.5">
              {NORMAL_PIECES.map((piece) => renderPieceButton(piece, 'gote'))}
            </div>
          </div>

          {/* 2行目: 成駒（先手 + 後手） */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-0.5">
              {PROMOTED_PIECES.map((piece) => renderPieceButton(piece, 'sente'))}
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-0.5">
              {PROMOTED_PIECES.map((piece) => renderPieceButton(piece, 'gote'))}
            </div>
          </div>

          {/* フッター: 選択解除・盤面リセット */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100">
            <button
              onClick={() => onPieceSelect(null, selectedOwner)}
              disabled={!selectedPiece}
              className={`text-xs transition-colors ${
                selectedPiece
                  ? 'text-slate-500 hover:text-slate-700'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              選択解除
            </button>
            <button
              onClick={onReset}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              盤面リセット
            </button>
          </div>
        </>
      )}

      {/* 手順設定モード時のヒント */}
      {mode === 'moves' && (
        <div className="text-center text-xs text-slate-400 py-1">
          駒をクリックして手を入力
        </div>
      )}
    </div>
  )
}

// =============================================================================
// 成り確認ダイアログ
// =============================================================================

function PromotionDialog({
  pieceType,
  onChoice,
}: {
  pieceType: PieceType
  onChoice: (promote: boolean) => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full mx-4">
        <h3 className="text-lg font-medium text-slate-800 mb-4 text-center">
          成りますか？
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => onChoice(true)}
            className="flex-1 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            成る
          </button>
          <button
            onClick={() => onChoice(false)}
            className="flex-1 py-3 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            不成
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// 手順ツリーパネル
// =============================================================================

function MoveTreePanel({
  nodes,
  currentTurn,
  onClear,
}: {
  nodes: MoveNode[]
  currentTurn: Player
  onClear: () => void
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="font-medium text-slate-700">手順ツリー</h2>
        <span className="text-xs text-slate-400">
          {currentTurn === 'sente' ? '先手番' : '後手番'}
        </span>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {nodes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            手順設定モードで<br />盤面をクリックして手を追加
          </div>
        ) : (
          <div className="space-y-1">
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
                  node.isPlayerMove ? 'bg-blue-50' : 'bg-orange-50'
                }`}
              >
                <span className="text-slate-400 w-5">{index + 1}.</span>
                <span className={node.isPlayerMove ? 'text-blue-700' : 'text-orange-700'}>
                  {node.isPlayerMove ? '▶' : '△'} {node.move}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 flex justify-between">
        <button className="flex items-center gap-2 text-xs text-primary hover:text-primary-dark font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          分岐を追加
        </button>
        {nodes.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-red-600 transition-colors"
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// 問題リストパネル
// =============================================================================

function ProblemListPanel({
  problems,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  problems: Problem[]
  selectedIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
  onDelete: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <h2 className="text-sm font-medium text-slate-700">
          問題
          <span className="ml-1 text-xs text-slate-400">({problems.length})</span>
        </h2>
        <button
          onClick={onAdd}
          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          title="問題を追加"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {problems.map((problem, index) => (
          <div
            key={problem.id}
            onClick={() => onSelect(index)}
            className={`group flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors ${
              index === selectedIndex
                ? 'bg-primary/10 border-l-2 border-primary'
                : 'hover:bg-slate-50 border-l-2 border-transparent'
            }`}
          >
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-medium ${
              index === selectedIndex
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-600 truncate">
                {problem.instruction || '指示文なし'}
              </p>
            </div>
            {/* ホバー時にアクションボタン表示 */}
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp(index) }}
                disabled={index === 0}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded disabled:opacity-30"
                title="上へ"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown(index) }}
                disabled={index === problems.length - 1}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded disabled:opacity-30"
                title="下へ"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(index) }}
                disabled={problems.length <= 1}
                className="p-0.5 text-slate-400 hover:text-red-500 rounded disabled:opacity-30"
                title="削除"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {problems.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400">
            問題なし
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function ProblemEdit() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const lessonData = lessonId ? getLessonById(lessonId) : undefined

  // 状態
  const [mode, setMode] = useState<EditorMode>('setup')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [problems, setProblems] = useState<Problem[]>(lessonData?.lesson.problems ?? [])

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
  const [moveTreeNodes, setMoveTreeNodes] = useState<MoveNode[]>([])
  const [currentTurn, setCurrentTurn] = useState<Player>('sente')

  // 現在選択中の問題
  const selectedProblem = problems[selectedIndex]

  // 初期盤面状態（問題のSFENから）
  const initialBoardState = useMemo(() => {
    if (!selectedProblem) return createEmptyBoardState()
    return parseSfen(selectedProblem.sfen)
  }, [selectedProblem?.sfen])

  // 手順設定モード用の現在盤面
  const [moveModeBoardState, setMoveModeBoardState] = useState(initialBoardState)

  // モードに応じて使用する盤面を選択
  const boardState = mode === 'moves' ? moveModeBoardState : initialBoardState

  // モード切り替え・問題切り替え時に手順モード状態をリセット
  useEffect(() => {
    setMoveModeBoardState(initialBoardState)
    setMoveTreeNodes([])
    setCurrentTurn('sente')
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [initialBoardState, mode])

  // 指示文変更
  const handleInstructionChange = useCallback((value: string) => {
    if (!selectedProblem) return
    const newProblems = [...problems]
    newProblems[selectedIndex] = { ...selectedProblem, instruction: value }
    setProblems(newProblems)
  }, [problems, selectedIndex, selectedProblem])

  // 問題追加
  const handleAddProblem = useCallback(() => {
    const newProblem: Problem = {
      id: `new-${Date.now()}`,
      order: problems.length + 1,
      sfen: '9/9/9/9/9/9/9/9/9 b - 1',
      instruction: '',
      correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
    }
    setProblems([...problems, newProblem])
    setSelectedIndex(problems.length)
  }, [problems])

  // 問題削除
  const handleDeleteProblem = useCallback((index: number) => {
    if (problems.length <= 1) return
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
    try {
      // TODO: API呼び出し
      console.log('Save problems:', problems)
      // 成功時の処理（将来的にトースト通知など）
    } catch (error) {
      console.error('Failed to save problems:', error)
      // エラー時の処理（将来的にトースト通知など）
    }
  }, [problems])

  // 駒パレット選択
  const handlePaletteSelect = useCallback((piece: PieceType | null, owner: Player) => {
    setSelectedPalettePiece(piece)
    setSelectedOwner(owner)
  }, [])

  // 盤面セルクリック（初期配置モード）
  const handleSetupCellClick = useCallback((row: number, col: number) => {
    if (!selectedProblem) return

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
  }, [selectedProblem, selectedPalettePiece, selectedOwner, problems, selectedIndex])

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
  }, [boardState, selectedPosition, selectedHandPiece, possibleMoves, currentTurn])

  // 手を実行（盤上の移動）
  const executeMove = useCallback((from: Position, to: Position, promote: boolean) => {
    const sfenMove = positionToSfenMove(from, to, promote)
    const isPlayerMove = currentTurn === 'sente' // 先手がプレイヤー想定

    // 新しいノードを作成
    const newNode = createMoveNode(sfenMove, isPlayerMove)

    // ツリーに追加（現在はルートに追加）
    setMoveTreeNodes(prev => [...prev, newNode])

    // 盤面を更新
    const newBoardState = makeMove(moveModeBoardState, from, to, promote)
    if (newBoardState) {
      setMoveModeBoardState(newBoardState)
    }

    // 手番を切り替え
    setCurrentTurn(prev => prev === 'sente' ? 'gote' : 'sente')

    // 選択状態をリセット
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [currentTurn, moveModeBoardState])

  // 駒を打つ
  const executeDrop = useCallback((pieceType: PieceType, to: Position) => {
    const sfenMove = dropToSfenMove(pieceType, to)
    const isPlayerMove = selectedHandPieceOwner === 'sente'

    // 新しいノードを作成
    const newNode = createMoveNode(sfenMove, isPlayerMove)

    // ツリーに追加
    setMoveTreeNodes(prev => [...prev, newNode])

    // 盤面を更新
    const newBoardState = makeDrop(moveModeBoardState, pieceType, to, selectedHandPieceOwner)
    if (newBoardState) {
      setMoveModeBoardState(newBoardState)
    }

    // 手番を切り替え
    setCurrentTurn(prev => prev === 'sente' ? 'gote' : 'sente')

    // 選択状態をリセット
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [selectedHandPieceOwner, moveModeBoardState])

  // 成り選択
  const handlePromotionChoice = useCallback((promote: boolean) => {
    if (!pendingPromotion) return
    executeMove(pendingPromotion.from, pendingPromotion.to, promote)
    setPendingPromotion(null)
  }, [pendingPromotion, executeMove])

  // 手順クリア
  const handleMoveTreeClear = useCallback(() => {
    setMoveModeBoardState(initialBoardState)
    setMoveTreeNodes([])
    setCurrentTurn('sente')
    setSelectedPosition(null)
    setSelectedHandPiece(null)
    setPossibleMoves([])
  }, [initialBoardState])

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
    const emptySfen = '9/9/9/9/9/9/9/9/9 b - 1'
    const newProblems = [...problems]
    newProblems[selectedIndex] = { ...selectedProblem, sfen: emptySfen }
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

  // レッスンが見つからない場合
  if (!lessonData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">レッスンが見つかりません</p>
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
        lessonTitle={lessonData.lesson.title}
        breadcrumb={`${lessonData.course.title} / ${lessonData.section.title}`}
        onSave={handleSave}
      />

      {/* メインコンテンツ（3パネル） */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左パネル: 問題リスト（狭め） */}
        <div className="w-[200px] flex-shrink-0 bg-white border-r border-slate-200">
          <ProblemListPanel
            problems={problems}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
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
            nodes={moveTreeNodes}
            currentTurn={currentTurn}
            onClear={handleMoveTreeClear}
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
