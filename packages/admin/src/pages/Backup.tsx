/**
 * バックアップ管理ページ
 *
 * - バックアップファイル一覧（ダウンロード・削除）
 * - 詰将棋エクスポート/インポート
 * - レッスンエクスポート/インポート
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type BackupFileInfo,
  type DuplicateAction,
  type ImportResult,
  deleteBackupFile,
  downloadBackupFile,
  exportLesson,
  exportTsumeshogi,
  getBackupFiles,
  importLessonFromFile,
  importLessonFromUpload,
  importTsumeshogiFromFile,
  importTsumeshogiFromUpload,
} from '../api/backup'

// =============================================================================
// アイコンコンポーネント
// =============================================================================

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  )
}

function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 14v-6m0 0l-3 3m3-3l3 3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

// =============================================================================
// ユーティリティ
// =============================================================================

/** ファイルサイズをフォーマット */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 日時をフォーマット */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** インポート結果をフォーマット */
function formatImportResult(result: ImportResult): string {
  const parts: string[] = []
  if (result.created > 0) parts.push(`${result.created}件作成`)
  if (result.updated > 0) parts.push(`${result.updated}件更新`)
  if (result.skipped > 0) parts.push(`${result.skipped}件スキップ`)
  return parts.join('、') || '変更なし'
}

// =============================================================================
// サブコンポーネント
// =============================================================================

/** ファイルアップロードコンポーネント */
function FileUploadButton({
  inputRef,
  onChange,
  selectedFilename,
  disabled,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  selectedFilename: string
  disabled: boolean
}) {
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        onChange={onChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2.5
          border-2 border-dashed rounded-lg w-full
          transition-colors
          ${
            disabled
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              : selectedFilename
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-slate-300 bg-white text-slate-600 hover:border-primary hover:bg-primary/5'
          }
        `}
      >
        {selectedFilename ? (
          <>
            <CheckIcon className="w-5 h-5" />
            <span className="truncate">{selectedFilename}</span>
          </>
        ) : (
          <>
            <UploadIcon className="w-5 h-5" />
            <span>ファイルを選択...</span>
          </>
        )}
      </button>
    </div>
  )
}

/** メッセージバナー */
function MessageBanner({
  message,
  onClose,
}: {
  message: { type: 'success' | 'error'; text: string }
  onClose: () => void
}) {
  const isSuccess = message.type === 'success'
  return (
    <div
      className={`
        mb-6 px-4 py-3 rounded-lg flex items-center justify-between
        ${isSuccess ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}
      `}
    >
      <div className="flex items-center gap-2">
        {isSuccess ? <CheckIcon className="w-5 h-5" /> : <XIcon className="w-5 h-5" />}
        <span className="text-sm">{message.text}</span>
      </div>
      <button
        onClick={onClose}
        className={`p-1 rounded hover:bg-black/10 transition-colors ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

// =============================================================================
// メインコンポーネント
// =============================================================================

/** タブの種類 */
type TabType = 'tsumeshogi' | 'lesson'

/** タブ設定 */
const TABS: { id: TabType; label: string; description: string }[] = [
  { id: 'tsumeshogi', label: '詰将棋', description: '全ての詰将棋データをJSONファイルとして保存' },
  { id: 'lesson', label: 'レッスン', description: '全てのレッスンデータ（コース、セクション、問題）をJSONファイルとして保存' },
]

export function Backup() {
  // タブ
  const [activeTab, setActiveTab] = useState<TabType>('tsumeshogi')

  // ファイル一覧
  const [files, setFiles] = useState<BackupFileInfo[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [filesError, setFilesError] = useState<string | null>(null)

  // エクスポート/インポート状態
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('skip')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadData, setUploadData] = useState<unknown>(null)
  const [uploadFilename, setUploadFilename] = useState<string>('')

  // 結果メッセージ
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ファイル一覧を読み込み
  const loadFiles = useCallback(async () => {
    setFilesLoading(true)
    setFilesError(null)
    try {
      const data = await getBackupFiles()
      setFiles(data)
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : 'ファイル一覧の取得に失敗しました')
    } finally {
      setFilesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // ファイル削除
  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`${filename} を削除しますか？`)) return
    try {
      await deleteBackupFile(filename)
      setMessage({ type: 'success', text: `${filename} を削除しました` })
      await loadFiles()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '削除に失敗しました',
      })
    }
  }

  // タブ切り替え時に状態をリセット
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSelectedFile('')
    setUploadData(null)
    setUploadFilename('')
    setDuplicateAction('skip')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // エクスポート
  const handleExport = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const result = activeTab === 'tsumeshogi'
        ? await exportTsumeshogi()
        : await exportLesson()
      const label = activeTab === 'tsumeshogi' ? '詰将棋' : 'レッスン'
      const unit = activeTab === 'tsumeshogi' ? '件' : 'コース'
      setMessage({
        type: 'success',
        text: `${label}を ${result.count} ${unit}エクスポートしました（${result.filename}）`,
      })
      await loadFiles()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'エクスポートに失敗しました',
      })
    } finally {
      setExporting(false)
    }
  }

  // インポート
  const handleImport = async () => {
    setImporting(true)
    setMessage(null)
    try {
      let result: ImportResult
      if (uploadData) {
        result = activeTab === 'tsumeshogi'
          ? await importTsumeshogiFromUpload(uploadData, duplicateAction)
          : await importLessonFromUpload(uploadData, duplicateAction)
      } else if (selectedFile) {
        result = activeTab === 'tsumeshogi'
          ? await importTsumeshogiFromFile(selectedFile, duplicateAction)
          : await importLessonFromFile(selectedFile, duplicateAction)
      } else {
        throw new Error('ファイルを選択してください')
      }
      const label = activeTab === 'tsumeshogi' ? '詰将棋' : 'レッスン'
      setMessage({
        type: 'success',
        text: `${label}をインポートしました: ${formatImportResult(result)}`,
      })
      // リセット
      setUploadData(null)
      setUploadFilename('')
      setSelectedFile('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'インポートに失敗しました',
      })
    } finally {
      setImporting(false)
    }
  }

  // ファイルアップロード
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      setUploadData(data)
      setUploadFilename(file.name)
      setSelectedFile('')
    } catch {
      setMessage({ type: 'error', text: 'ファイルの読み込みに失敗しました' })
    }
  }

  // 現在のタブに対応するファイル一覧
  const filteredFiles = files.filter((f) => f.type === activeTab)
  const currentTab = TABS.find((t) => t.id === activeTab)!

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">バックアップ管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          詰将棋・レッスンデータのエクスポート・インポート
        </p>
      </div>

      {/* メッセージ表示 */}
      {message && <MessageBanner message={message} onClose={() => setMessage(null)} />}

      {/* エクスポート/インポートセクション */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        {/* タブ */}
        <div className="flex border-b border-slate-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex-1 px-6 py-4 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* エクスポート */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">エクスポート</h3>
            <p className="text-sm text-slate-500 mb-3">{currentTab.description}</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExportIcon className="w-4 h-4" />
              {exporting ? 'エクスポート中...' : 'エクスポート'}
            </button>
          </div>

          {/* インポート */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-700 mb-3">インポート</h3>

            {/* サーバー上のファイルから */}
            <div className="mb-3">
              <label className="block text-sm text-slate-600 mb-1.5">
                サーバー上のファイルから
              </label>
              <select
                value={selectedFile}
                onChange={(e) => {
                  setSelectedFile(e.target.value)
                  setUploadData(null)
                  setUploadFilename('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
                disabled={!!uploadData}
              >
                <option value="">選択してください</option>
                {filteredFiles.map((f) => (
                  <option key={f.filename} value={f.filename}>
                    {f.filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center text-xs text-slate-400 my-3">または</div>

            {/* ファイルアップロード */}
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1.5">ファイルをアップロード</label>
              <FileUploadButton
                inputRef={fileInputRef}
                onChange={handleFileUpload}
                selectedFilename={uploadFilename}
                disabled={!!selectedFile}
              />
            </div>

            {/* 重複時の動作 */}
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1.5">重複時の動作</label>
              <select
                value={duplicateAction}
                onChange={(e) => setDuplicateAction(e.target.value as DuplicateAction)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="skip">スキップ（安全）</option>
                <option value="overwrite">
                  {activeTab === 'lesson' ? '上書き（削除後再作成）' : '上書き'}
                </option>
              </select>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || (!selectedFile && !uploadData)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImportIcon className="w-4 h-4" />
              {importing ? 'インポート中...' : 'インポート実行'}
            </button>
          </div>
        </div>
      </section>

      {/* バックアップファイル一覧 */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-slate-400" />
            バックアップファイル
          </h2>
        </div>
        <div className="p-6">
          {filesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500">読み込み中...</div>
            </div>
          ) : filesError ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-red-500 mb-4">{filesError}</div>
              <button
                onClick={loadFiles}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                再読み込み
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <FolderIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500">バックアップファイルがありません</p>
              <p className="mt-1 text-sm text-slate-400">
                エクスポートを実行するとここに表示されます
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-64">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                    <th className="pb-3 font-medium">ファイル名</th>
                    <th className="pb-3 font-medium">種類</th>
                    <th className="pb-3 font-medium">サイズ</th>
                    <th className="pb-3 font-medium">作成日時</th>
                    <th className="pb-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {files.map((file) => (
                    <tr key={file.filename} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-3 font-mono text-slate-800">{file.filename}</td>
                      <td className="py-3">
                        <span
                          className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${
                              file.type === 'tsumeshogi'
                                ? 'bg-blue-100 text-blue-700'
                                : file.type === 'lesson'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-700'
                            }
                          `}
                        >
                          {file.type === 'tsumeshogi'
                            ? '詰将棋'
                            : file.type === 'lesson'
                              ? 'レッスン'
                              : '不明'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{formatFileSize(file.size)}</td>
                      <td className="py-3 text-slate-600">{formatDate(file.createdAt)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={async () => {
                              try {
                                await downloadBackupFile(file.filename)
                              } catch (err) {
                                setMessage({
                                  type: 'error',
                                  text: err instanceof Error ? err.message : 'ダウンロードに失敗しました',
                                })
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="ダウンロード"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.filename)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="削除"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
