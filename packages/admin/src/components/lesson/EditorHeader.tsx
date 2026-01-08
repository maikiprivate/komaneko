/**
 * エディタヘッダーコンポーネント
 */

import { Link } from 'react-router-dom'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface EditorHeaderProps {
  lessonTitle: string
  breadcrumb: string
  onSave: () => void
  saveStatus: SaveStatus
}

export function EditorHeader({ lessonTitle, breadcrumb, onSave, saveStatus }: EditorHeaderProps) {
  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            保存中...
          </>
        )
      case 'saved':
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            保存しました
          </>
        )
      case 'error':
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            エラー
          </>
        )
      default:
        return '保存'
    }
  }

  const getSaveButtonClass = () => {
    const base =
      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors'
    switch (saveStatus) {
      case 'saving':
        return `${base} bg-slate-400 text-white cursor-not-allowed`
      case 'saved':
        return `${base} bg-green-500 text-white`
      case 'error':
        return `${base} bg-red-500 text-white`
      default:
        return `${base} bg-primary text-white hover:bg-primary-dark`
    }
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-4">
        <Link
          to="/lessons"
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
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
          disabled={saveStatus === 'saving'}
          className={getSaveButtonClass()}
        >
          {getSaveButtonContent()}
        </button>
      </div>
    </div>
  )
}
