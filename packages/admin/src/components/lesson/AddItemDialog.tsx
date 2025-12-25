/**
 * 汎用アイテム追加ダイアログコンポーネント
 * セクション追加・レッスン追加で共通利用
 */

import { useState, useEffect } from 'react'

interface AddItemDialogProps {
  /** ダイアログタイトル */
  title: string
  /** 親要素名（サブタイトルとして表示） */
  parentName: string
  /** 入力フィールドのラベル */
  inputLabel: string
  /** プレースホルダー */
  placeholder: string
  /** 追加ボタン押下時のコールバック */
  onAdd: (data: { title: string }) => void
  /** キャンセル時のコールバック */
  onCancel: () => void
}

export function AddItemDialog({
  title,
  parentName,
  inputLabel,
  placeholder,
  onAdd,
  onCancel,
}: AddItemDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const [touched, setTouched] = useState(false)

  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    onAdd({ title: inputValue.trim() })
  }

  const showError = touched && !inputValue.trim()

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{parentName}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {inputLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => setTouched(true)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${
                  showError ? 'border-red-300' : 'border-slate-200'
                }`}
                placeholder={placeholder}
                autoFocus
              />
              {showError && (
                <p className="mt-1.5 text-xs text-red-500">
                  {inputLabel}を入力してください
                </p>
              )}
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
