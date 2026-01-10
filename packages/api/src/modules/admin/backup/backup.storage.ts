/**
 * バックアップファイルストレージ
 *
 * ファイルシステムへのバックアップファイル保存・読み込み。
 * 将来的にはS3等のクラウドストレージにも対応可能な設計。
 */

import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// バックアップディレクトリのパスを取得
const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKUP_DIR = join(__dirname, '..', '..', '..', '..', 'backups')

/** バックアップファイル情報 */
export interface BackupFileInfo {
  filename: string
  type: 'tsumeshogi' | 'lesson' | 'unknown'
  size: number
  createdAt: Date
}

/**
 * バックアップディレクトリを確保
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await mkdir(BACKUP_DIR, { recursive: true })
  } catch {
    // ディレクトリが既に存在する場合は無視
  }
}

/**
 * ファイル名からバックアップタイプを判定
 */
function getBackupType(filename: string): 'tsumeshogi' | 'lesson' | 'unknown' {
  if (filename.startsWith('tsumeshogi-')) return 'tsumeshogi'
  if (filename.startsWith('lesson-')) return 'lesson'
  return 'unknown'
}

/**
 * タイムスタンプ付きファイル名を生成
 */
export function generateFilename(type: 'tsumeshogi' | 'lesson'): string {
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15) // YYYYMMDD-HHmmss
  return `${type}-${timestamp}.json`
}

/**
 * バックアップファイル一覧を取得
 */
export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  await ensureBackupDir()

  const files = await readdir(BACKUP_DIR)
  const jsonFiles = files.filter((f) => f.endsWith('.json'))

  const fileInfos: BackupFileInfo[] = []
  for (const filename of jsonFiles) {
    const filePath = join(BACKUP_DIR, filename)
    const fileStat = await stat(filePath)
    fileInfos.push({
      filename,
      type: getBackupType(filename),
      size: fileStat.size,
      createdAt: fileStat.birthtime,
    })
  }

  // 作成日時の降順でソート（新しい順）
  return fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * バックアップファイルを保存
 */
export async function saveBackupFile(filename: string, data: unknown): Promise<string> {
  await ensureBackupDir()

  const filePath = join(BACKUP_DIR, filename)
  const content = JSON.stringify(data, null, 2)
  await writeFile(filePath, content, 'utf-8')

  return filePath
}

/**
 * バックアップファイルを読み込み
 */
export async function readBackupFile(filename: string): Promise<unknown> {
  const filePath = join(BACKUP_DIR, filename)
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * バックアップファイルを削除
 */
export async function deleteBackupFile(filename: string): Promise<void> {
  const filePath = join(BACKUP_DIR, filename)
  await unlink(filePath)
}

/**
 * バックアップファイルが存在するか確認
 */
export async function backupFileExists(filename: string): Promise<boolean> {
  try {
    const filePath = join(BACKUP_DIR, filename)
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * バックアップファイルのフルパスを取得
 */
export function getBackupFilePath(filename: string): string {
  return join(BACKUP_DIR, filename)
}
