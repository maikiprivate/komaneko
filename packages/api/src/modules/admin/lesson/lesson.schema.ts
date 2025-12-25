/**
 * レッスン管理API用Zodスキーマ
 */

import { z } from 'zod'

// =============================================================================
// 定数
// =============================================================================

/** タイトルの最大文字数 */
const MAX_TITLE_LENGTH = 100

// =============================================================================
// Course
// =============================================================================

export const createCourseSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(MAX_TITLE_LENGTH, `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`),
  description: z.string().default(''),
  status: z.enum(['draft', 'published']).default('draft'),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>

export const updateCourseSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(MAX_TITLE_LENGTH, `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
})

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>

// =============================================================================
// Section
// =============================================================================

export const createSectionSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(MAX_TITLE_LENGTH, `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`),
  courseId: z.string().uuid('無効なコースIDです'),
})

export type CreateSectionInput = z.infer<typeof createSectionSchema>

export const updateSectionSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(MAX_TITLE_LENGTH, `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`).optional(),
})

export type UpdateSectionInput = z.infer<typeof updateSectionSchema>

// =============================================================================
// Lesson
// =============================================================================

export const createLessonSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(MAX_TITLE_LENGTH, `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`),
  sectionId: z.string().uuid('無効なセクションIDです'),
})

export type CreateLessonInput = z.infer<typeof createLessonSchema>

export const updateLessonSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(MAX_TITLE_LENGTH, `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`).optional(),
})

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>

// =============================================================================
// Problem
// =============================================================================

/**
 * SFEN形式のバリデーションパターン
 * 例: "9/9/9/9/9/9/9/9/9 b - 1"
 * 例: "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1"
 */
const SFEN_PATTERN = /^[pnbrgskPNBRGSK+1-9/]+\s+[bw]\s+(-|[PLNSGBRplnsgbr0-9]+)\s+\d+$/

/**
 * SFEN形式の手のバリデーションパターン
 * - 通常の移動: "7g7f", "7g7f+" (ファイル+ランク+ファイル+ランク+成り)
 * - 駒打ち: "P*5e" (駒種+*+ファイル+ランク)
 */
const SFEN_MOVE_PATTERN = /^([1-9][a-i][1-9][a-i]\+?|[PLNSGBRK]\*[1-9][a-i])$/

/** SFEN形式の手（例: "7g7f", "P*5e"） */
export const sfenMoveSchema = z.string().regex(SFEN_MOVE_PATTERN, '無効な手の形式です')

/** 手順シーケンス（例: ["7g7f", "3c3d", "2g2f"]） */
export const moveSequenceSchema = z.array(sfenMoveSchema)

/** 手順ツリー（シリアライズ形式 = 全パスの配列） */
export const moveTreeSchema = z.array(moveSequenceSchema)

/** SFEN局面のバリデーション */
const sfenSchema = z.string().min(1, 'SFENは必須です').regex(SFEN_PATTERN, '無効なSFEN形式です')

export const createProblemSchema = z.object({
  sfen: sfenSchema,
  playerTurn: z.enum(['black', 'white']).default('black'),
  moveTree: moveTreeSchema.default([]),
  lessonId: z.string().uuid('無効なレッスンIDです'),
})

export type CreateProblemInput = z.infer<typeof createProblemSchema>

export const updateProblemSchema = z.object({
  sfen: sfenSchema.optional(),
  playerTurn: z.enum(['black', 'white']).optional(),
  moveTree: moveTreeSchema.optional(),
})

export type UpdateProblemInput = z.infer<typeof updateProblemSchema>

// =============================================================================
// 並び替え
// =============================================================================

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid('無効なIDです')).min(1, 'IDが必要です'),
})

export type ReorderInput = z.infer<typeof reorderSchema>

export const reorderWithParentSchema = z.object({
  parentId: z.string().uuid('無効な親IDです'),
  orderedIds: z.array(z.string().uuid('無効なIDです')).min(1, 'IDが必要です'),
})

export type ReorderWithParentInput = z.infer<typeof reorderWithParentSchema>
