/**
 * バックアップ管理APIクライアント
 */

import { apiRequest } from './client'

// =============================================================================
// 型定義
// =============================================================================

/** バックアップファイル情報 */
export interface BackupFileInfo {
  filename: string
  type: 'tsumeshogi' | 'lesson' | 'unknown'
  size: number
  createdAt: string
}

/** エクスポート結果 */
export interface ExportResult {
  filename: string
  count: number
}

/** インポート結果 */
export interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
}

/** インポートオプション */
export type DuplicateAction = 'skip' | 'overwrite'

// =============================================================================
// ファイル管理
// =============================================================================

/**
 * バックアップファイル一覧を取得
 */
export async function getBackupFiles(): Promise<BackupFileInfo[]> {
  return apiRequest<BackupFileInfo[]>('/api/admin/backup/files')
}

/**
 * バックアップファイルを削除
 */
export async function deleteBackupFile(filename: string): Promise<void> {
  return apiRequest<void>(`/api/admin/backup/files/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  })
}

/**
 * バックアップファイルのダウンロードURLを取得
 */
export function getBackupDownloadUrl(filename: string): string {
  const token = localStorage.getItem('token')
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}/api/admin/backup/files/${encodeURIComponent(filename)}/download?token=${token}`
}

// =============================================================================
// 詰将棋
// =============================================================================

/**
 * 詰将棋をエクスポート
 */
export async function exportTsumeshogi(): Promise<ExportResult> {
  return apiRequest<ExportResult>('/api/admin/backup/tsumeshogi/export', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

/**
 * 詰将棋をインポート（サーバー上のファイルから）
 */
export async function importTsumeshogiFromFile(
  filename: string,
  duplicateAction: DuplicateAction = 'skip'
): Promise<ImportResult> {
  return apiRequest<ImportResult>('/api/admin/backup/tsumeshogi/import', {
    method: 'POST',
    body: JSON.stringify({
      filename,
      options: { duplicateAction },
    }),
  })
}

/**
 * 詰将棋をインポート（アップロードデータから）
 */
export async function importTsumeshogiFromUpload(
  data: unknown,
  duplicateAction: DuplicateAction = 'skip'
): Promise<ImportResult> {
  return apiRequest<ImportResult>(
    `/api/admin/backup/tsumeshogi/import/upload?duplicateAction=${duplicateAction}`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

// =============================================================================
// レッスン
// =============================================================================

/**
 * レッスンをエクスポート
 */
export async function exportLesson(): Promise<ExportResult> {
  return apiRequest<ExportResult>('/api/admin/backup/lesson/export', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

/**
 * レッスンをインポート（サーバー上のファイルから）
 */
export async function importLessonFromFile(
  filename: string,
  duplicateAction: DuplicateAction = 'skip'
): Promise<ImportResult> {
  return apiRequest<ImportResult>('/api/admin/backup/lesson/import', {
    method: 'POST',
    body: JSON.stringify({
      filename,
      options: { duplicateAction },
    }),
  })
}

/**
 * レッスンをインポート（アップロードデータから）
 */
export async function importLessonFromUpload(
  data: unknown,
  duplicateAction: DuplicateAction = 'skip'
): Promise<ImportResult> {
  return apiRequest<ImportResult>(
    `/api/admin/backup/lesson/import/upload?duplicateAction=${duplicateAction}`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}
