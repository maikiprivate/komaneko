/**
 * レッスンAPI関数
 */

import { apiRequest } from './client'

// =============================================================================
// 取得系の型定義
// =============================================================================

/** レッスン一覧用（コース一覧内のネスト） */
export interface LessonSummary {
  id: string
  title: string
  problemCount: number
}

/** セクション（コース一覧内のネスト） */
export interface SectionData {
  id: string
  title: string
  lessons: LessonSummary[]
}

/** コース */
export interface CourseData {
  id: string
  title: string
  description: string
  sections: SectionData[]
}

/** 問題（レッスン詳細内のネスト） */
export interface ProblemData {
  id: string
  sfen: string
  playerTurn: 'black' | 'white'
  moveTree: unknown // SfenMove[][]
  instruction: string
}

/** レッスン詳細 */
export interface LessonData {
  id: string
  title: string
  sectionId: string
  problems: ProblemData[]
}

// =============================================================================
// 取得系API
// =============================================================================

/**
 * コース一覧を取得
 */
export async function getCourses(): Promise<CourseData[]> {
  return apiRequest<CourseData[]>('/api/lesson/courses')
}

/**
 * コース詳細を取得
 *
 * @param courseId コースID
 */
export async function getCourse(courseId: string): Promise<CourseData> {
  return apiRequest<CourseData>(`/api/lesson/courses/${courseId}`)
}

/**
 * レッスン詳細を取得
 *
 * @param lessonId レッスンID
 */
export async function getLesson(lessonId: string): Promise<LessonData> {
  return apiRequest<LessonData>(`/api/lesson/lessons/${lessonId}`)
}

// =============================================================================
// 記録系の型定義
// =============================================================================

/** 問題ごとの記録（API用） */
export interface ProblemAttemptInput {
  problemId: string
  problemIndex: number
  isCorrect: boolean
  usedHint: boolean
  usedSolution: boolean
}

/** 学習記録リクエスト */
export interface RecordLessonRequest {
  lessonId: string
  problems: ProblemAttemptInput[]
  completionSeconds?: number
}

/** 学習記録レスポンス */
export interface RecordLessonResponse {
  hearts: {
    consumed: number
    remaining: number
    recoveryStartedAt: string
  } | null
  streak: {
    currentCount: number
    longestCount: number
    updated: boolean
    isNewRecord: boolean
  }
  completedDates: string[]
}

/**
 * レッスンの学習記録を送信
 *
 * 完了時のみ呼び出す（中断時はAPI呼び出しなし）。
 * 問題ごとの詳細（isCorrect, usedHint, usedSolution）を記録する。
 *
 * @param request レッスンIDと問題ごとの詳細
 */
export async function recordLesson(
  request: RecordLessonRequest
): Promise<RecordLessonResponse> {
  return apiRequest<RecordLessonResponse>('/api/lesson/record', {
    method: 'POST',
    body: request,
  })
}
