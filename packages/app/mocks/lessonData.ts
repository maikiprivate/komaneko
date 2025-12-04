/**
 * 駒塾（レッスン）モックデータ
 */

// =============================================================================
// 型定義
// =============================================================================

/** レッスンのステータス */
export type LessonStatus = 'locked' | 'available' | 'completed'

/** コースのステータス */
export type CourseStatus = 'locked' | 'available' | 'completed'

/** 問題の位置情報 */
export interface Position {
  row: number
  col: number
}

/** 正解の手 */
export interface CorrectMove {
  from: Position
  to: Position
  promote?: boolean
}

/** 問題 */
export interface Problem {
  id: string
  sfen: string
  instruction: string
  correctMove: CorrectMove
}

/** レッスン */
export interface Lesson {
  id: string
  title: string
  status: LessonStatus
  problems: Problem[]
}

/** セクション */
export interface Section {
  id: string
  title: string
  lessons: Lesson[]
}

/** コース */
export interface Course {
  id: string
  title: string
  description: string
  icon: string
  status: CourseStatus
  progress: number
  sections: Section[]
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/** コースIDからコースを取得 */
export function getCourseById(courseId: string): Course | undefined {
  return MOCK_COURSES.find((c) => c.id === courseId)
}

/** レッスンIDからレッスンを取得 */
export function getLessonById(courseId: string, lessonId: string): Lesson | undefined {
  const course = getCourseById(courseId)
  if (!course) return undefined

  for (const section of course.sections) {
    const lesson = section.lessons.find((l) => l.id === lessonId)
    if (lesson) return lesson
  }
  return undefined
}

/** コースの全レッスンをフラット化して取得 */
export function getAllLessons(course: Course): Lesson[] {
  return course.sections.flatMap((s) => s.lessons)
}

// =============================================================================
// モックデータ: 駒の動かし方コース
// =============================================================================

const PIECE_MOVEMENT_COURSE: Course = {
  id: 'piece-movement',
  title: '駒の動かし方',
  description: '将棋の基本、各駒の動き方を学ぼう',
  icon: 'chess-pawn',
  status: 'available',
  progress: 0,
  sections: [
    {
      id: 'fu',
      title: '歩',
      lessons: [
        {
          id: 'fu-basics',
          title: '歩の基本',
          status: 'available',
          problems: [
            {
              id: 'fu-1',
              sfen: '9/9/9/9/4P4/9/9/9/9 b - 1',
              instruction: '歩を1マス前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
            {
              id: 'fu-2',
              sfen: '9/9/9/4p4/4P4/9/9/9/9 b - 1',
              instruction: '歩で相手の歩を取ってにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
            {
              id: 'fu-3',
              sfen: '9/9/4P4/9/9/9/9/9/9 b - 1',
              instruction: '歩を成らせてにゃ！（と金にする）',
              correctMove: { from: { row: 2, col: 4 }, to: { row: 1, col: 4 }, promote: true },
            },
          ],
        },
        {
          id: 'fu-capture',
          title: '歩で取る',
          status: 'locked',
          problems: [
            {
              id: 'fu-cap-1',
              sfen: '9/9/9/3p5/3P5/9/9/9/9 b - 1',
              instruction: '相手の駒を取ってにゃ！',
              correctMove: { from: { row: 4, col: 3 }, to: { row: 3, col: 3 } },
            },
          ],
        },
      ],
    },
    {
      id: 'kin',
      title: '金',
      lessons: [
        {
          id: 'kin-basics',
          title: '金の基本',
          status: 'locked',
          problems: [
            {
              id: 'kin-1',
              sfen: '9/9/9/9/4G4/9/9/9/9 b - 1',
              instruction: '金を前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
          ],
        },
        {
          id: 'kin-defense',
          title: '金で守る',
          status: 'locked',
          problems: [
            {
              id: 'kin-def-1',
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
      title: '銀',
      lessons: [
        {
          id: 'gin-basics',
          title: '銀の基本',
          status: 'locked',
          problems: [
            {
              id: 'gin-1',
              sfen: '9/9/9/9/4S4/9/9/9/9 b - 1',
              instruction: '銀を斜め前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } },
            },
          ],
        },
      ],
    },
    {
      id: 'kei',
      title: '桂',
      lessons: [
        {
          id: 'kei-basics',
          title: '桂の基本',
          status: 'locked',
          problems: [
            {
              id: 'kei-1',
              sfen: '9/9/9/9/9/9/4N4/9/9 b - 1',
              instruction: '桂馬を跳ねてにゃ！',
              correctMove: { from: { row: 6, col: 4 }, to: { row: 4, col: 3 } },
            },
          ],
        },
      ],
    },
    {
      id: 'kyo',
      title: '香',
      lessons: [
        {
          id: 'kyo-basics',
          title: '香の基本',
          status: 'locked',
          problems: [
            {
              id: 'kyo-1',
              sfen: '9/9/9/9/9/9/9/4L4/9 b - 1',
              instruction: '香車を前に進めてにゃ！',
              correctMove: { from: { row: 7, col: 4 }, to: { row: 3, col: 4 } },
            },
          ],
        },
      ],
    },
    {
      id: 'hisha',
      title: '飛',
      lessons: [
        {
          id: 'hisha-basics',
          title: '飛の基本',
          status: 'locked',
          problems: [
            {
              id: 'hisha-1',
              sfen: '9/9/9/9/4R4/9/9/9/9 b - 1',
              instruction: '飛車を前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 0, col: 4 } },
            },
          ],
        },
      ],
    },
    {
      id: 'kaku',
      title: '角',
      lessons: [
        {
          id: 'kaku-basics',
          title: '角の基本',
          status: 'locked',
          problems: [
            {
              id: 'kaku-1',
              sfen: '9/9/9/9/4B4/9/9/9/9 b - 1',
              instruction: '角を斜めに動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 0, col: 0 } },
            },
          ],
        },
      ],
    },
    {
      id: 'ou',
      title: '王',
      lessons: [
        {
          id: 'ou-basics',
          title: '王の基本',
          status: 'locked',
          problems: [
            {
              id: 'ou-1',
              sfen: '9/9/9/9/4K4/9/9/9/9 b - 1',
              instruction: '王を1マス動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
          ],
        },
      ],
    },
  ],
}

// =============================================================================
// モックデータ: ダミーコース（ロック状態）
// =============================================================================

const BASIC_TESUJI_COURSE: Course = {
  id: 'basic-tesuji',
  title: '基本手筋',
  description: '実戦で役立つ基本的な手筋を学ぼう',
  icon: 'lightbulb-o',
  status: 'locked',
  progress: 0,
  sections: [],
}

const JOSEKI_INTRO_COURSE: Course = {
  id: 'joseki-intro',
  title: '定跡入門',
  description: '序盤の基本的な駒組みを学ぼう',
  icon: 'book',
  status: 'locked',
  progress: 0,
  sections: [],
}

// =============================================================================
// エクスポート
// =============================================================================

export const MOCK_COURSES: Course[] = [
  PIECE_MOVEMENT_COURSE,
  BASIC_TESUJI_COURSE,
  JOSEKI_INTRO_COURSE,
]
