/**
 * 上下移動ボタンコンポーネント
 */

interface OrderButtonsProps {
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

export function OrderButtons({
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: OrderButtonsProps) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onMoveUp()
        }}
        disabled={!canMoveUp}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        title="上に移動"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onMoveDown()
        }}
        disabled={!canMoveDown}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        title="下に移動"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}
