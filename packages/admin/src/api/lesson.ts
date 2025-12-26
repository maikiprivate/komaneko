/**
 * レッスン管理API クライアント
 *
 * Course → Section → Lesson → Problem のCRUD操作
 */

import { apiRequest } from './client'

// =============================================================================
// 型定義（APIレスポンス用）
// =============================================================================

/** コースのステータス */
export type CourseStatus = 'draft' | 'published'

/** 問題（API形式） */
export interface ApiProblem {
  id: string
  order: number
  sfen: string
  playerTurn: 'black' | 'white'
  moveTree: string[][] // SFEN手順の配列
  instruction: string // 指示文
  lessonId: string
  createdAt: string
  updatedAt: string
}

/** レッスン（API形式） */
export interface ApiLesson {
  id: string
  order: number
  title: string
  sectionId: string
  problems: ApiProblem[]
  createdAt: string
  updatedAt: string
}

/** セクション（API形式） */
export interface ApiSection {
  id: string
  order: number
  title: string
  courseId: string
  lessons: ApiLesson[]
  createdAt: string
  updatedAt: string
}

/** コース（API形式） */
export interface ApiCourse {
  id: string
  order: number
  title: string
  description: string
  status: CourseStatus
  sections: ApiSection[]
  createdAt: string
  updatedAt: string
}

// =============================================================================
// 入力型
// =============================================================================

export interface CreateCourseInput {
  title: string
  description?: string
  status?: CourseStatus
}

export interface UpdateCourseInput {
  title?: string
  description?: string
  status?: CourseStatus
}

export interface CreateSectionInput {
  title: string
  courseId: string
}

export interface UpdateSectionInput {
  title?: string
}

export interface CreateLessonInput {
  title: string
  sectionId: string
}

export interface UpdateLessonInput {
  title?: string
}

export interface CreateProblemInput {
  sfen: string
  playerTurn?: 'black' | 'white'
  moveTree?: string[][]
  instruction?: string
  lessonId: string
}

export interface UpdateProblemInput {
  sfen?: string
  playerTurn?: 'black' | 'white'
  moveTree?: string[][]
  instruction?: string
}

// =============================================================================
// Course API
// =============================================================================

/** 全コース取得（ネスト構造含む） */
export async function getCourses(): Promise<ApiCourse[]> {
  return apiRequest<ApiCourse[]>('/api/admin/lesson/courses')
}

/** コース作成 */
export async function createCourse(data: CreateCourseInput): Promise<ApiCourse> {
  return apiRequest<ApiCourse>('/api/admin/lesson/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** コース更新 */
export async function updateCourse(id: string, data: UpdateCourseInput): Promise<ApiCourse> {
  return apiRequest<ApiCourse>(`/api/admin/lesson/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** コース削除 */
export async function deleteCourse(id: string): Promise<void> {
  await apiRequest<void>(`/api/admin/lesson/courses/${id}`, {
    method: 'DELETE',
  })
}

/** コース並び替え */
export async function reorderCourses(orderedIds: string[]): Promise<void> {
  await apiRequest<void>('/api/admin/lesson/courses/reorder', {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  })
}

// =============================================================================
// Section API
// =============================================================================

/** セクション作成 */
export async function createSection(data: CreateSectionInput): Promise<ApiSection> {
  return apiRequest<ApiSection>('/api/admin/lesson/sections', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** セクション更新 */
export async function updateSection(id: string, data: UpdateSectionInput): Promise<ApiSection> {
  return apiRequest<ApiSection>(`/api/admin/lesson/sections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** セクション削除 */
export async function deleteSection(id: string): Promise<void> {
  await apiRequest<void>(`/api/admin/lesson/sections/${id}`, {
    method: 'DELETE',
  })
}

/** セクション並び替え */
export async function reorderSections(courseId: string, orderedIds: string[]): Promise<void> {
  await apiRequest<void>('/api/admin/lesson/sections/reorder', {
    method: 'PUT',
    body: JSON.stringify({ parentId: courseId, orderedIds }),
  })
}

// =============================================================================
// Lesson API
// =============================================================================

/** レッスン作成 */
export async function createLesson(data: CreateLessonInput): Promise<ApiLesson> {
  return apiRequest<ApiLesson>('/api/admin/lesson/lessons', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** レッスン更新 */
export async function updateLesson(id: string, data: UpdateLessonInput): Promise<ApiLesson> {
  return apiRequest<ApiLesson>(`/api/admin/lesson/lessons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** レッスン削除 */
export async function deleteLesson(id: string): Promise<void> {
  await apiRequest<void>(`/api/admin/lesson/lessons/${id}`, {
    method: 'DELETE',
  })
}

/** レッスン並び替え */
export async function reorderLessons(sectionId: string, orderedIds: string[]): Promise<void> {
  await apiRequest<void>('/api/admin/lesson/lessons/reorder', {
    method: 'PUT',
    body: JSON.stringify({ parentId: sectionId, orderedIds }),
  })
}

// =============================================================================
// Problem API
// =============================================================================

/** 問題詳細取得 */
export async function getProblem(id: string): Promise<ApiProblem> {
  return apiRequest<ApiProblem>(`/api/admin/lesson/problems/${id}`)
}

/** 問題作成 */
export async function createProblem(data: CreateProblemInput): Promise<ApiProblem> {
  return apiRequest<ApiProblem>('/api/admin/lesson/problems', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 問題更新 */
export async function updateProblem(id: string, data: UpdateProblemInput): Promise<ApiProblem> {
  return apiRequest<ApiProblem>(`/api/admin/lesson/problems/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** 問題削除 */
export async function deleteProblem(id: string): Promise<void> {
  await apiRequest<void>(`/api/admin/lesson/problems/${id}`, {
    method: 'DELETE',
  })
}

/** 問題並び替え */
export async function reorderProblems(lessonId: string, orderedIds: string[]): Promise<void> {
  await apiRequest<void>('/api/admin/lesson/problems/reorder', {
    method: 'PUT',
    body: JSON.stringify({ parentId: lessonId, orderedIds }),
  })
}
