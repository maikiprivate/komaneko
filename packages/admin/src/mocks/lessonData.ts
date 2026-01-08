/**
 * レッスン管理用モックデータ
 *
 * 階層構造: Course → Section → Lesson → Problem
 */

import type { CorrectMove, MoveTree } from '../lib/lesson/types'

// =============================================================================
// 型定義（管理画面用）
// =============================================================================

/** コースのステータス（管理用） */
export type CourseStatus = 'draft' | 'published' | 'archived'

// CorrectMove は types.ts から import
export type { CorrectMove }

/** 問題 */
export interface Problem {
  id: string
  order: number
  sfen: string
  instruction: string
  correctMove: CorrectMove
  /** 手順ツリー（複数手順対応） */
  moveTree?: MoveTree
}

/** レッスン */
export interface Lesson {
  id: string
  order: number
  title: string
  problems: Problem[]
}

/** セクション */
export interface Section {
  id: string
  order: number
  title: string
  lessons: Lesson[]
}

/** コース */
export interface Course {
  id: string
  order: number
  title: string
  description: string
  status: CourseStatus
  sections: Section[]
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/** コースIDからコースを取得 */
export function getCourseById(courseId: string): Course | undefined {
  return mockCourses.find((c) => c.id === courseId)
}

/** レッスンIDからレッスンを取得 */
export function getLessonById(lessonId: string):
  | {
      course: Course
      section: Section
      lesson: Lesson
    }
  | undefined {
  for (const course of mockCourses) {
    for (const section of course.sections) {
      const lesson = section.lessons.find((l) => l.id === lessonId)
      if (lesson) {
        return { course, section, lesson }
      }
    }
  }
  return undefined
}

/** 問題数を取得 */
export function getProblemCount(lesson: Lesson): number {
  return lesson.problems.length
}

/** コースの総問題数を取得 */
export function getCourseProblemCount(course: Course): number {
  return course.sections.reduce(
    (total, section) =>
      total + section.lessons.reduce((sum, lesson) => sum + lesson.problems.length, 0),
    0,
  )
}

// =============================================================================
// モックデータ
// =============================================================================

export const mockCourses: Course[] = [
  {
    id: 'piece-movement',
    order: 1,
    title: '駒の動かし方',
    description: '将棋の基本、各駒の動き方を学ぼう',
    status: 'published',
    sections: [
      {
        id: 'fu',
        order: 1,
        title: '歩の動かし方',
        lessons: [
          {
            id: 'fu-basics',
            order: 1,
            title: '歩の動き方',
            problems: [
              {
                id: 'fu-1',
                order: 1,
                sfen: '9/9/9/9/4P4/9/9/9/9 b - 1',
                instruction: '歩を1マス前に動かしてにゃ！',
                correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
              },
              {
                id: 'fu-2',
                order: 2,
                sfen: '9/9/9/9/9/4P4/9/9/9 b - 1',
                instruction: '歩を前に進めてにゃ！',
                correctMove: { from: { row: 5, col: 4 }, to: { row: 4, col: 4 } },
              },
            ],
          },
          {
            id: 'fu-capture',
            order: 2,
            title: '歩で取る',
            problems: [
              {
                id: 'fu-cap-1',
                order: 1,
                sfen: '9/9/9/4p4/4P4/9/9/9/9 b - 1',
                instruction: '歩で相手の歩を取ってにゃ！',
                correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
              },
            ],
          },
          {
            id: 'fu-promote',
            order: 3,
            title: '歩を成る',
            problems: [
              {
                id: 'fu-pro-1',
                order: 1,
                sfen: '9/9/4P4/9/9/9/9/9/9 b - 1',
                instruction: '歩を成らせてにゃ！（と金にする）',
                correctMove: { from: { row: 2, col: 4 }, to: { row: 1, col: 4 }, promote: true },
              },
            ],
          },
        ],
      },
      {
        id: 'kin',
        order: 2,
        title: '金の動かし方',
        lessons: [
          {
            id: 'kin-basics',
            order: 1,
            title: '金の動き方',
            problems: [
              {
                id: 'kin-1',
                order: 1,
                sfen: '9/9/9/9/4G4/9/9/9/9 b - 1',
                instruction: '金を前に動かしてにゃ！',
                correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
              },
            ],
          },
          {
            id: 'kin-diagonal',
            order: 2,
            title: '金の斜め移動',
            problems: [
              {
                id: 'kin-dia-1',
                order: 1,
                sfen: '9/9/9/9/4G4/9/9/9/9 b - 1',
                instruction: '金を斜め前に動かしてにゃ！',
                correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } },
              },
            ],
          },
        ],
      },
      {
        id: 'gin',
        order: 3,
        title: '銀の動かし方',
        lessons: [
          {
            id: 'gin-basics',
            order: 1,
            title: '銀の動き方',
            problems: [
              {
                id: 'gin-1',
                order: 1,
                sfen: '9/9/9/9/4S4/9/9/9/9 b - 1',
                instruction: '銀を斜め前に動かしてにゃ！',
                correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'basic-tesuji',
    order: 2,
    title: '基本手筋',
    description: '実戦で役立つ基本的な手筋を学ぼう',
    status: 'draft',
    sections: [
      {
        id: 'tesuji-intro',
        order: 1,
        title: '手筋とは',
        lessons: [
          {
            id: 'tesuji-intro-1',
            order: 1,
            title: '手筋の基本',
            problems: [
              {
                id: 'tesuji-1',
                order: 1,
                sfen: '9/9/9/9/4P4/9/9/9/9 b - 1',
                instruction: 'サンプル問題',
                correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'joseki-intro',
    order: 3,
    title: '定跡入門',
    description: '序盤の基本的な駒組みを学ぼう',
    status: 'draft',
    sections: [],
  },
]
