/**
 * バックアップ管理APIルーター
 *
 * 管理者専用のデータバックアップ・リストア機能。
 */

import { createReadStream } from 'node:fs'
import type { FastifyInstance } from 'fastify'

import { prisma } from '../../../db/client.js'
import { AppError } from '../../../shared/errors/AppError.js'
import { createAdminMiddleware } from '../../../shared/middleware/admin.middleware.js'
import { createAuthMiddleware } from '../../../shared/middleware/auth.middleware.js'
import { getAuthenticatedUserId } from '../../../shared/utils/getAuthenticatedUserId.js'
import { createAuthRepository } from '../../auth/auth.repository.js'
import { createBackupRepository } from './backup.repository.js'
import {
  importOptionsSchema,
  lessonFullExportSchema,
  lessonImportRequestSchema,
  tsumeshogiExportSchema,
  tsumeshogiImportRequestSchema,
} from './backup.schema.js'
import { BackupService } from './backup.service.js'
import { backupFileExists, getBackupFilePath } from './backup.storage.js'

/** レスポンス用のタイムスタンプを生成 */
function getMeta() {
  return { timestamp: new Date().toISOString() }
}

export async function adminBackupRouter(app: FastifyInstance) {
  // 依存関係の初期化
  const authRepository = createAuthRepository(prisma)
  const authMiddleware = createAuthMiddleware(authRepository)
  const adminMiddleware = createAdminMiddleware(authRepository)
  const backupRepository = createBackupRepository(prisma)
  const backupService = new BackupService(backupRepository)

  // 認証・認可フック: 全エンドポイントで管理者権限必須
  app.addHook('preHandler', async (request) => {
    // 認証
    request.user = await authMiddleware.authenticate(request.headers.authorization)
    // 管理者認可
    const userId = getAuthenticatedUserId(request)
    await adminMiddleware.authorize(userId)
  })

  // ===========================================================================
  // ファイル管理
  // ===========================================================================

  /**
   * GET /files - バックアップファイル一覧取得
   */
  app.get('/files', async (_request, reply) => {
    const files = await backupService.listFiles()
    return reply.send({ data: files, meta: getMeta() })
  })

  /**
   * DELETE /files/:filename - バックアップファイル削除
   */
  app.delete<{ Params: { filename: string } }>(
    '/files/:filename',
    async (request, reply) => {
      await backupService.deleteFile(request.params.filename)
      return reply.status(204).send()
    }
  )

  /**
   * GET /files/:filename/download - バックアップファイルダウンロード
   */
  app.get<{ Params: { filename: string } }>(
    '/files/:filename/download',
    async (request, reply) => {
      const { filename } = request.params

      const exists = await backupFileExists(filename)
      if (!exists) {
        throw new AppError('BACKUP_FILE_NOT_FOUND')
      }

      const filePath = getBackupFilePath(filename)
      const stream = createReadStream(filePath)

      return reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(stream)
    }
  )

  // ===========================================================================
  // 詰将棋
  // ===========================================================================

  /**
   * POST /tsumeshogi/export - 詰将棋エクスポート
   */
  app.post('/tsumeshogi/export', async (_request, reply) => {
    const result = await backupService.exportTsumeshogi()
    return reply.status(201).send({ data: result, meta: getMeta() })
  })

  /**
   * POST /tsumeshogi/import - 詰将棋インポート
   *
   * ボディに filename を指定した場合はサーバー上のファイルからインポート。
   * multipart/form-data でファイルをアップロードした場合はそのファイルからインポート。
   */
  app.post('/tsumeshogi/import', async (request, reply) => {
    // リクエストボディをパース
    const parseResult = tsumeshogiImportRequestSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { filename, options } = parseResult.data
    const importOptions = options ?? { duplicateAction: 'skip' }

    if (filename) {
      // サーバー上のファイルからインポート
      const result = await backupService.importTsumeshogi(filename, importOptions)
      return reply.send({ data: result, meta: getMeta() })
    }

    // ファイルがアップロードされていない場合はエラー
    throw new AppError('INVALID_INPUT', {
      message: 'filename か file のいずれかを指定してください',
    })
  })

  /**
   * POST /tsumeshogi/import/upload - 詰将棋インポート（ファイルアップロード）
   */
  app.post('/tsumeshogi/import/upload', async (request, reply) => {
    // JSONボディとしてデータを受け取る
    const parseResult = tsumeshogiExportSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    // オプションはクエリパラメータから取得
    const query = request.query as { duplicateAction?: string }
    const optionsResult = importOptionsSchema.safeParse({
      duplicateAction: query.duplicateAction ?? 'skip',
    })
    const options = optionsResult.success
      ? optionsResult.data
      : { duplicateAction: 'skip' as const }

    const result = await backupService.importTsumeshogiFromData(
      parseResult.data.items,
      options
    )
    return reply.send({ data: result, meta: getMeta() })
  })

  // ===========================================================================
  // レッスン
  // ===========================================================================

  /**
   * POST /lesson/export - レッスンエクスポート
   */
  app.post('/lesson/export', async (_request, reply) => {
    const result = await backupService.exportLesson()
    return reply.status(201).send({ data: result, meta: getMeta() })
  })

  /**
   * POST /lesson/import - レッスンインポート
   */
  app.post('/lesson/import', async (request, reply) => {
    const parseResult = lessonImportRequestSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const { filename, options } = parseResult.data
    const importOptions = options ?? { duplicateAction: 'skip' }

    if (filename) {
      const result = await backupService.importLesson(filename, importOptions)
      return reply.send({ data: result, meta: getMeta() })
    }

    throw new AppError('INVALID_INPUT', {
      message: 'filename か file のいずれかを指定してください',
    })
  })

  /**
   * POST /lesson/import/upload - レッスンインポート（ファイルアップロード）
   */
  app.post('/lesson/import/upload', async (request, reply) => {
    const parseResult = lessonFullExportSchema.safeParse(request.body)
    if (!parseResult.success) {
      throw new AppError('INVALID_INPUT', {
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const query = request.query as { duplicateAction?: string }
    const optionsResult = importOptionsSchema.safeParse({
      duplicateAction: query.duplicateAction ?? 'skip',
    })
    const options = optionsResult.success
      ? optionsResult.data
      : { duplicateAction: 'skip' as const }

    const result = await backupService.importLessonFromData(
      parseResult.data.items,
      options
    )
    return reply.send({ data: result, meta: getMeta() })
  })
}
