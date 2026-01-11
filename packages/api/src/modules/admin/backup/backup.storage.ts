/**
 * バックアップファイルストレージ
 *
 * ファイルシステムへのバックアップファイル保存・読み込み。
 * 将来的にはS3等のクラウドストレージにも対応可能な設計。
 */

import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

// バックアップディレクトリのパスを取得
const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKUP_DIR = join(__dirname, '..', '..', '..', '..', 'backups')

/**
 * ファイル名のバリデーション（パストラバーサル対策）
 * @throws Error 不正なファイル名の場合
 */
function validateFilename(filename: string): void {
  // 空文字チェック
  if (!filename || filename.trim() === '') {
    throw new Error('ファイル名が空です')
  }

  // パス区切り文字を含む場合は拒否
  if (filename.includes('/') || filename.includes('\\')) {
    throw new Error('ファイル名にパス区切り文字を含めることはできません')
  }

  // ..を含む場合は拒否（親ディレクトリ参照）
  if (filename.includes('..')) {
    throw new Error('ファイル名に".."を含めることはできません')
  }

  // .jsonで終わっていない場合は拒否
  if (!filename.endsWith('.json')) {
    throw new Error('ファイル名は.jsonで終わる必要があります')
  }

  // basenameと一致しない場合は拒否（追加の安全策）
  if (basename(filename) !== filename) {
    throw new Error('不正なファイル名です')
  }

  // 正規化後のパスがバックアップディレクトリ外を指す場合は拒否
  const normalizedPath = normalize(join(BACKUP_DIR, filename))
  if (!normalizedPath.startsWith(BACKUP_DIR)) {
    throw new Error('不正なファイルパスです')
  }
}

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
  validateFilename(filename)
  await ensureBackupDir()

  const filePath = join(BACKUP_DIR, filename)
  const content = JSON.stringify(data, null, 2)
  await writeFile(filePath, content, 'utf-8')

  return filePath
}

/**
 * バックアップファイルを読み込み
 * @throws Error ファイル読み込みエラーまたはJSONパースエラー
 */
export async function readBackupFile(filename: string): Promise<unknown> {
  validateFilename(filename)
  const filePath = join(BACKUP_DIR, filename)
  const content = await readFile(filePath, 'utf-8')

  try {
    return JSON.parse(content)
  } catch (err) {
    throw new Error(
      `バックアップファイルの形式が不正です: ${err instanceof SyntaxError ? err.message : '不明なエラー'}`
    )
  }
}

/**
 * バックアップファイルを削除
 */
export async function deleteBackupFile(filename: string): Promise<void> {
  validateFilename(filename)
  const filePath = join(BACKUP_DIR, filename)
  await unlink(filePath)
}

/**
 * バックアップファイルが存在するか確認
 */
export async function backupFileExists(filename: string): Promise<boolean> {
  try {
    validateFilename(filename)
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
  validateFilename(filename)
  return join(BACKUP_DIR, filename)
}
