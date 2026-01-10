/**
 * バックアップ機能のZodスキーマ
 */

import { z } from 'zod'

// =============================================================================
// 共通
// =============================================================================

/** エクスポートメタデータ */
export const exportMetaSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  type: z.enum(['tsumeshogi', 'lesson']),
  count: z.number(),
})

/** インポートオプション */
export const importOptionsSchema = z.object({
  /** 重複時の動作: skip=スキップ, overwrite=上書き */
  duplicateAction: z.enum(['skip', 'overwrite']).default('skip'),
})

// =============================================================================
// 詰将棋
// =============================================================================

/** 詰将棋エクスポートアイテム */
export const tsumeshogiExportItemSchema = z.object({
  sfen: z.string(),
  moveCount: z.number(),
  problemNumber: z.number(),
  status: z.enum(['draft', 'published', 'archived']),
})

/** 詰将棋エクスポートデータ */
export const tsumeshogiExportSchema = z.object({
  meta: exportMetaSchema,
  items: z.array(tsumeshogiExportItemSchema),
})

/** 詰将棋インポートリクエスト */
export const tsumeshogiImportRequestSchema = z.object({
  /** サーバー上のファイル名（ファイルアップロードでない場合） */
  filename: z.string().optional(),
  /** インポートオプション */
  options: importOptionsSchema.optional(),
})

// =============================================================================
// レッスン
// =============================================================================

/** レッスン問題エクスポート */
export const lessonProblemExportSchema = z.object({
  order: z.number(),
  sfen: z.string(),
  playerTurn: z.enum(['black', 'white']),
  moveTree: z.unknown(),
  instruction: z.string(),
  explanation: z.string(),
})

/** レッスンエクスポート */
export const lessonExportSchema = z.object({
  order: z.number(),
  title: z.string(),
  problems: z.array(lessonProblemExportSchema),
})

/** セクションエクスポート */
export const sectionExportSchema = z.object({
  order: z.number(),
  title: z.string(),
  lessons: z.array(lessonExportSchema),
})

/** コースエクスポート */
export const courseExportSchema = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  sections: z.array(sectionExportSchema),
})

/** レッスン全体エクスポートデータ */
export const lessonFullExportSchema = z.object({
  meta: exportMetaSchema,
  items: z.array(courseExportSchema),
})

/** レッスンインポートリクエスト */
export const lessonImportRequestSchema = z.object({
  /** サーバー上のファイル名（ファイルアップロードでない場合） */
  filename: z.string().optional(),
  /** インポートオプション */
  options: importOptionsSchema.optional(),
})

// =============================================================================
// 型エクスポート
// =============================================================================

export type ExportMeta = z.infer<typeof exportMetaSchema>
export type ImportOptions = z.infer<typeof importOptionsSchema>

export type TsumeshogiExportItem = z.infer<typeof tsumeshogiExportItemSchema>
export type TsumeshogiExportData = z.infer<typeof tsumeshogiExportSchema>
export type TsumeshogiImportRequest = z.infer<typeof tsumeshogiImportRequestSchema>

export type LessonProblemExport = z.infer<typeof lessonProblemExportSchema>
export type LessonExport = z.infer<typeof lessonExportSchema>
export type SectionExport = z.infer<typeof sectionExportSchema>
export type CourseExport = z.infer<typeof courseExportSchema>
export type LessonFullExportData = z.infer<typeof lessonFullExportSchema>
export type LessonImportRequest = z.infer<typeof lessonImportRequestSchema>
