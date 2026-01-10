/**
 * バックアップサービス
 *
 * エクスポート・インポートのビジネスロジック。
 */

import type { Prisma } from '@prisma/client'

import { AppError } from '../../../shared/errors/AppError.js'
import type { BackupRepository, CourseCreateInput } from './backup.repository.js'
import type {
  CourseExport,
  ImportOptions,
  LessonFullExportData,
  TsumeshogiExportData,
  TsumeshogiExportItem,
} from './backup.schema.js'
import {
  lessonFullExportSchema,
  tsumeshogiExportSchema,
} from './backup.schema.js'
import {
  type BackupFileInfo,
  backupFileExists,
  deleteBackupFile,
  generateFilename,
  listBackupFiles,
  readBackupFile,
  saveBackupFile,
} from './backup.storage.js'

/** インポート結果 */
export interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
}

export class BackupService {
  constructor(private repository: BackupRepository) {}

  // ===========================================================================
  // ファイル管理
  // ===========================================================================

  /**
   * バックアップファイル一覧を取得
   */
  async listFiles(): Promise<BackupFileInfo[]> {
    return listBackupFiles()
  }

  /**
   * バックアップファイルを削除
   */
  async deleteFile(filename: string): Promise<void> {
    const exists = await backupFileExists(filename)
    if (!exists) {
      throw new AppError('BACKUP_FILE_NOT_FOUND')
    }
    await deleteBackupFile(filename)
  }

  // ===========================================================================
  // 詰将棋エクスポート
  // ===========================================================================

  /**
   * 詰将棋をエクスポートしてファイルに保存
   */
  async exportTsumeshogi(): Promise<{ filename: string; count: number }> {
    const items = await this.repository.findAllTsumeshogi()
    const filename = generateFilename('tsumeshogi')

    const exportData: TsumeshogiExportData = {
      meta: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        type: 'tsumeshogi',
        count: items.length,
      },
      items,
    }

    await saveBackupFile(filename, exportData)

    return { filename, count: items.length }
  }

  // ===========================================================================
  // 詰将棋インポート
  // ===========================================================================

  /**
   * 詰将棋をファイルからインポート
   */
  async importTsumeshogi(
    filename: string,
    options: ImportOptions = { duplicateAction: 'skip' }
  ): Promise<ImportResult> {
    // ファイル存在確認
    const exists = await backupFileExists(filename)
    if (!exists) {
      throw new AppError('BACKUP_FILE_NOT_FOUND')
    }

    // ファイル読み込みとバリデーション
    const rawData = await readBackupFile(filename)
    const parseResult = tsumeshogiExportSchema.safeParse(rawData)
    if (!parseResult.success) {
      throw new AppError('INVALID_BACKUP_FILE', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const data = parseResult.data
    return this.importTsumeshogiFromData(data.items, options)
  }

  /**
   * 詰将棋をデータからインポート（アップロードファイル用）
   */
  async importTsumeshogiFromData(
    items: TsumeshogiExportItem[],
    options: ImportOptions = { duplicateAction: 'skip' }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      total: items.length,
      created: 0,
      updated: 0,
      skipped: 0,
    }

    for (const item of items) {
      const existing = await this.repository.findTsumeshogiBySfen(item.sfen)

      if (existing) {
        // 重複あり
        if (options.duplicateAction === 'skip') {
          result.skipped++
        } else {
          // overwrite
          await this.repository.upsertTsumeshogi(item, existing.id)
          result.updated++
        }
      } else {
        // 新規
        await this.repository.upsertTsumeshogi(item, null)
        result.created++
      }
    }

    return result
  }

  // ===========================================================================
  // レッスンエクスポート
  // ===========================================================================

  /**
   * レッスンをエクスポートしてファイルに保存
   */
  async exportLesson(): Promise<{ filename: string; count: number }> {
    const courses = await this.repository.findAllCoursesWithNested()
    const filename = generateFilename('lesson')

    const exportData: LessonFullExportData = {
      meta: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        type: 'lesson',
        count: courses.length,
      },
      items: courses.map((course) => ({
        order: course.order,
        title: course.title,
        description: course.description,
        status: course.status as 'draft' | 'published' | 'archived',
        sections: course.sections.map((section) => ({
          order: section.order,
          title: section.title,
          lessons: section.lessons.map((lesson) => ({
            order: lesson.order,
            title: lesson.title,
            problems: lesson.problems.map((problem) => ({
              order: problem.order,
              sfen: problem.sfen,
              playerTurn: problem.playerTurn as 'black' | 'white',
              moveTree: problem.moveTree,
              instruction: problem.instruction,
              explanation: problem.explanation,
            })),
          })),
        })),
      })),
    }

    await saveBackupFile(filename, exportData)

    return { filename, count: courses.length }
  }

  // ===========================================================================
  // レッスンインポート
  // ===========================================================================

  /**
   * レッスンをファイルからインポート
   */
  async importLesson(
    filename: string,
    options: ImportOptions = { duplicateAction: 'skip' }
  ): Promise<ImportResult> {
    // ファイル存在確認
    const exists = await backupFileExists(filename)
    if (!exists) {
      throw new AppError('BACKUP_FILE_NOT_FOUND')
    }

    // ファイル読み込みとバリデーション
    const rawData = await readBackupFile(filename)
    const parseResult = lessonFullExportSchema.safeParse(rawData)
    if (!parseResult.success) {
      throw new AppError('INVALID_BACKUP_FILE', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const data = parseResult.data
    return this.importLessonFromData(data.items, options)
  }

  /**
   * レッスンをデータからインポート（アップロードファイル用）
   */
  async importLessonFromData(
    courses: CourseExport[],
    options: ImportOptions = { duplicateAction: 'skip' }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      total: courses.length,
      created: 0,
      updated: 0,
      skipped: 0,
    }

    for (const course of courses) {
      const existing = await this.repository.findCourseByOrder(course.order)

      if (existing) {
        // 重複あり
        if (options.duplicateAction === 'skip') {
          result.skipped++
        } else {
          // overwrite: 削除して再作成
          await this.repository.deleteCourseById(existing.id)
          await this.repository.createCourseWithNested(
            this.convertCourseExportToInput(course)
          )
          result.updated++
        }
      } else {
        // 新規
        await this.repository.createCourseWithNested(
          this.convertCourseExportToInput(course)
        )
        result.created++
      }
    }

    return result
  }

  /**
   * CourseExportをCourseCreateInputに変換
   */
  private convertCourseExportToInput(course: CourseExport): CourseCreateInput {
    return {
      order: course.order,
      title: course.title,
      description: course.description,
      status: course.status,
      sections: course.sections.map((section) => ({
        order: section.order,
        title: section.title,
        lessons: section.lessons.map((lesson) => ({
          order: lesson.order,
          title: lesson.title,
          problems: lesson.problems.map((problem) => ({
            order: problem.order,
            sfen: problem.sfen,
            playerTurn: problem.playerTurn,
            moveTree: problem.moveTree as Prisma.InputJsonValue,
            instruction: problem.instruction,
            explanation: problem.explanation,
          })),
        })),
      })),
    }
  }
}
