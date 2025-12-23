/**
 * 問題編集ページ（3パネルレイアウト）
 *
 * - 左パネル: 盤面エディタ（駒パレット + 将棋盤 + 指示文 + モード切替）
 * - 中央パネル: 手順ツリー
 * - 右パネル: 問題リスト
 */

import { useState, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShogiBoardWithStands } from '../../components/shogi/ShogiBoardWithStands'
import { parseSfen } from '../../lib/shogi/sfen'
import { getLessonById, type Problem } from '../../mocks/lessonData'
import type { EditorMode } from '../../lib/lesson/types'
import type { PieceType, Player } from '../../lib/shogi/types'
import { createEmptyBoardState } from '../../lib/shogi/sfen'

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
// モード切替
// =============================================================================

function ModeToggle({
  mode,
  onChange,
}: {
  mode: EditorMode
  onChange: (mode: EditorMode) => void
}) {
  return (
    <div className="inline-flex p-1 bg-slate-100 rounded-lg">
      <button
        onClick={() => onChange('setup')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'setup'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        初期配置
      </button>
      <button
        onClick={() => onChange('moves')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'moves'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        手順設定
      </button>
    </div>
  )
}

// =============================================================================
// 駒パレット（初期配置モード用）
// =============================================================================

/** 通常駒 */
const NORMAL_PIECES: PieceType[] = [
  'ou', 'hi', 'kaku', 'kin', 'gin', 'kei', 'kyo', 'fu',
]

/** 成駒 */
const PROMOTED_PIECES: PieceType[] = [
  'ryu', 'uma', 'narigin', 'narikei', 'narikyo', 'to',
]

function PiecePalette({
  selectedPiece,
  selectedOwner,
  onSelect,
}: {
  selectedPiece: PieceType | null
  selectedOwner: Player
  onSelect: (piece: PieceType | null, owner: Player) => void
}) {
  const renderPieceButton = (piece: PieceType) => (
    <button
      key={piece}
      onClick={() => onSelect(selectedPiece === piece ? null : piece, selectedOwner)}
      className={`w-9 h-9 rounded border-2 transition-all flex items-center justify-center ${
        selectedPiece === piece
          ? 'border-primary bg-primary/10'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
      title={piece}
    >
      <img
        src={`/pieces/${piece}.png`}
        alt={piece}
        className={`w-6 h-6 ${selectedOwner === 'gote' ? 'rotate-180' : ''}`}
      />
    </button>
  )

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      {/* ヘッダー: 先手/後手 + 選択解除 */}
      <div className="flex items-center gap-3 mb-2">
        {/* 先手/後手トグル */}
        <div className="inline-flex p-0.5 bg-slate-100 rounded">
          <button
            onClick={() => onSelect(selectedPiece, 'sente')}
            className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
              selectedOwner === 'sente'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            先手
          </button>
          <button
            onClick={() => onSelect(selectedPiece, 'gote')}
            className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
              selectedOwner === 'gote'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            後手
          </button>
        </div>
        {/* 選択解除 */}
        {selectedPiece && (
          <button
            onClick={() => onSelect(null, selectedOwner)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            解除
          </button>
        )}
      </div>

      {/* 駒一覧（2行） */}
      <div className="space-y-1">
        {/* 通常駒 */}
        <div className="flex items-center gap-1">
          {NORMAL_PIECES.map(renderPieceButton)}
        </div>
        {/* 成駒 */}
        <div className="flex items-center gap-1">
          {PROMOTED_PIECES.map(renderPieceButton)}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// 手順ツリー（プレースホルダー）
// =============================================================================

function MoveTreePanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="font-medium text-slate-700">手順ツリー</h2>
      </div>
      <div className="flex-1 p-4">
        <div className="text-center py-8 text-slate-400 text-sm">
          手順設定モードで<br />盤面をクリックして手を追加
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-100">
        <button className="flex items-center gap-2 text-xs text-primary hover:text-primary-dark font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          分岐を追加
        </button>
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

  // 駒パレット状態
  const [selectedPalettePiece, setSelectedPalettePiece] = useState<PieceType | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<Player>('sente')

  // 現在選択中の問題
  const selectedProblem = problems[selectedIndex]

  // 盤面状態
  const boardState = useMemo(() => {
    if (!selectedProblem) return createEmptyBoardState()
    return parseSfen(selectedProblem.sfen)
  }, [selectedProblem?.sfen])

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
            {/* モード切替 + 駒パレット */}
            <div className="flex items-start gap-4">
              <ModeToggle mode={mode} onChange={setMode} />
              {mode === 'setup' && (
                <PiecePalette
                  selectedPiece={selectedPalettePiece}
                  selectedOwner={selectedOwner}
                  onSelect={handlePaletteSelect}
                />
              )}
            </div>

            {/* 将棋盤 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex justify-center">
                <ShogiBoardWithStands
                  boardState={boardState}
                  perspective="sente"
                  cellSize={40}
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
          <MoveTreePanel />
        </div>
      </div>
    </div>
  )
}
