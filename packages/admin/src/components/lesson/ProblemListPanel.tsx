/**
 * 問題リストパネルコンポーネント
 */

import type { Problem } from '../../mocks/lessonData'

interface ProblemListPanelProps {
  problems: Problem[]
  selectedIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
  onDelete: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export function ProblemListPanel({
  problems,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ProblemListPanelProps) {
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
            <span
              className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-medium ${
                index === selectedIndex ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
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
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveUp(index)
                }}
                disabled={index === 0}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded disabled:opacity-30"
                title="上へ"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveDown(index)
                }}
                disabled={index === problems.length - 1}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded disabled:opacity-30"
                title="下へ"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(index)
                }}
                disabled={problems.length <= 1}
                className="p-0.5 text-slate-400 hover:text-red-500 rounded disabled:opacity-30"
                title="削除"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {problems.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400">問題なし</div>
        )}
      </div>
    </div>
  )
}
