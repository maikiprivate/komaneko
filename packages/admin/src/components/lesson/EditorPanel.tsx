/**
 * 編集パネルコンポーネント（モード切替 + 駒パレット統合）
 */

import type { EditorMode } from '../../lib/lesson/types'
import type { PieceType, Player } from '../../lib/shogi/types'

/** 通常駒 */
const NORMAL_PIECES: PieceType[] = ['ou', 'hi', 'kaku', 'kin', 'gin', 'kei', 'kyo', 'fu']

/** 成駒 */
const PROMOTED_PIECES: PieceType[] = ['ryu', 'uma', 'narigin', 'narikei', 'narikyo', 'to']

interface EditorPanelProps {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  selectedPiece: PieceType | null
  selectedOwner: Player
  onPieceSelect: (piece: PieceType | null, owner: Player) => void
  onReset: () => void
  onSetInitialPosition: () => void
}

export function EditorPanel({
  mode,
  onModeChange,
  selectedPiece,
  selectedOwner,
  onPieceSelect,
  onReset,
  onSetInitialPosition,
}: EditorPanelProps) {
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
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

          {/* フッター: 初期配置・選択解除・盤面リセット */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100">
            <button
              onClick={onSetInitialPosition}
              className="text-xs text-primary hover:text-primary-dark transition-colors font-medium"
            >
              平手初期配置
            </button>
            <div className="w-px h-4 bg-slate-200" />
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
        <div className="text-center text-xs text-slate-400 py-1">駒をクリックして手を入力</div>
      )}
    </div>
  )
}
