/**
 * レッスンAPI関数
 */

import { apiRequest } from './client'

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
