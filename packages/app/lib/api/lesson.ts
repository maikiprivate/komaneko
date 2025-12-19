/**
 * レッスンAPI関数
 */

import { apiRequest } from './client'

/** 学習記録リクエスト */
export interface RecordLessonRequest {
  lessonId: string
  isCorrect: boolean
  correctCount: number
  totalCount: number
  completionTime: number
}

/** 学習記録レスポンス */
export interface RecordLessonResponse {
  // 正解時のみハート情報が返る（不正解時はnull）
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
 * ハート消費・ストリーク更新はサーバー側で処理される。
 * レッスン完了時に isCorrect: true を送信（部分正解でもストリーク更新）。
 *
 * @param request レッスンIDと学習結果
 */
export async function recordLesson(request: RecordLessonRequest): Promise<RecordLessonResponse> {
  return apiRequest<RecordLessonResponse>('/api/lesson/record', {
    method: 'POST',
    body: request,
  })
}
