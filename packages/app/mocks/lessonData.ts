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

/** 次のレッスンを取得（なければundefined） */
export function getNextLesson(courseId: string, currentLessonId: string): Lesson | undefined {
  const course = getCourseById(courseId)
  if (!course) return undefined

  const allLessons = getAllLessons(course)
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId)

  if (currentIndex === -1 || currentIndex >= allLessons.length - 1) {
    return undefined
  }

  return allLessons[currentIndex + 1]
}

// =============================================================================
// モックデータ: 駒の動かし方コース
// =============================================================================

const PIECE_MOVEMENT_COURSE: Course = {
  id: 'piece-movement',
  title: '駒の動かし方',
  description: '将棋の基本、各駒の動き方を学ぼう',
  status: 'available',
  progress: 0,
  sections: [
    {
      id: 'fu',
      title: '歩の動かし方',
      lessons: [
        {
          id: 'fu-basics',
          title: '歩の動き方',
          status: 'completed',
          problems: [
            {
              id: 'fu-1',
              sfen: '9/9/9/9/4P4/9/9/9/9 b - 1',
              instruction: '歩を1マス前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
          ],
        },
        {
          id: 'fu-capture',
          title: '歩で取る',
          status: 'completed',
          problems: [
            {
              id: 'fu-cap-1',
              sfen: '9/9/9/4p4/4P4/9/9/9/9 b - 1',
              instruction: '歩で相手の歩を取ってにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
          ],
        },
        {
          id: 'fu-promote',
          title: '歩を成る',
          status: 'available',
          problems: [
            {
              id: 'fu-pro-1',
              sfen: '9/9/4P4/9/9/9/9/9/9 b - 1',
              instruction: '歩を成らせてにゃ！（と金にする）',
              correctMove: { from: { row: 2, col: 4 }, to: { row: 1, col: 4 }, promote: true },
            },
          ],
        },
        {
          id: 'fu-practice',
          title: '歩の練習',
          status: 'locked',
          problems: [
            {
              id: 'fu-pra-1',
              sfen: '9/9/9/3p5/3P5/9/9/9/9 b - 1',
              instruction: '相手の駒を取ってにゃ！',
              correctMove: { from: { row: 4, col: 3 }, to: { row: 3, col: 3 } },
            },
          ],
        },
        {
          id: 'fu-master',
          title: '歩のマスター',
          status: 'locked',
          problems: [
            {
              id: 'fu-mas-1',
              sfen: '9/9/9/9/4P4/9/9/9/9 b - 1',
              instruction: '歩を1マス前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
          ],
        },
      ],
    },
    {
      id: 'kin',
      title: '金の動かし方',
      lessons: [
        {
          id: 'kin-basics',
          title: '金の動き方',
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
          id: 'kin-diagonal',
          title: '金の斜め移動',
          status: 'locked',
          problems: [
            {
              id: 'kin-dia-1',
              sfen: '9/9/9/9/4G4/9/9/9/9 b - 1',
              instruction: '金を斜め前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } },
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
              instruction: '金を横に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 4, col: 3 } },
            },
          ],
        },
        {
          id: 'kin-practice',
          title: '金の練習',
          status: 'locked',
          problems: [
            {
              id: 'kin-pra-1',
              sfen: '9/9/9/9/4G4/9/9/9/9 b - 1',
              instruction: '金を後ろに動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } },
            },
          ],
        },
      ],
    },
    {
      id: 'gin',
      title: '銀の動かし方',
      lessons: [
        {
          id: 'gin-basics',
          title: '銀の動き方',
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
        {
          id: 'gin-forward',
          title: '銀の前進',
          status: 'locked',
          problems: [
            {
              id: 'gin-fwd-1',
              sfen: '9/9/9/9/4S4/9/9/9/9 b - 1',
              instruction: '銀を前に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
            },
          ],
        },
        {
          id: 'gin-retreat',
          title: '銀の引き',
          status: 'locked',
          problems: [
            {
              id: 'gin-ret-1',
              sfen: '9/9/9/9/4S4/9/9/9/9 b - 1',
              instruction: '銀を斜め後ろに動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 5, col: 3 } },
            },
          ],
        },
      ],
    },
    {
      id: 'kei',
      title: '桂の動かし方',
      lessons: [
        {
          id: 'kei-basics',
          title: '桂の動き方',
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
        {
          id: 'kei-jump',
          title: '桂馬の跳躍',
          status: 'locked',
          problems: [
            {
              id: 'kei-jmp-1',
              sfen: '9/9/9/9/9/9/4N4/9/9 b - 1',
              instruction: '桂馬を右に跳ねてにゃ！',
              correctMove: { from: { row: 6, col: 4 }, to: { row: 4, col: 5 } },
            },
          ],
        },
        {
          id: 'kei-attack',
          title: '桂で攻める',
          status: 'locked',
          problems: [
            {
              id: 'kei-atk-1',
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
      title: '香の動かし方',
      lessons: [
        {
          id: 'kyo-basics',
          title: '香の動き方',
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
        {
          id: 'kyo-attack',
          title: '香で攻める',
          status: 'locked',
          problems: [
            {
              id: 'kyo-atk-1',
              sfen: '9/9/9/9/9/9/9/4L4/9 b - 1',
              instruction: '香車を一気に進めてにゃ！',
              correctMove: { from: { row: 7, col: 4 }, to: { row: 1, col: 4 } },
            },
          ],
        },
      ],
    },
    {
      id: 'hisha',
      title: '飛の動かし方',
      lessons: [
        {
          id: 'hisha-basics',
          title: '飛の動き方',
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
        {
          id: 'hisha-side',
          title: '飛の横移動',
          status: 'locked',
          problems: [
            {
              id: 'hisha-side-1',
              sfen: '9/9/9/9/4R4/9/9/9/9 b - 1',
              instruction: '飛車を横に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 4, col: 0 } },
            },
          ],
        },
        {
          id: 'hisha-promote',
          title: '飛を成る（竜）',
          status: 'locked',
          problems: [
            {
              id: 'hisha-pro-1',
              sfen: '9/9/4R4/9/9/9/9/9/9 b - 1',
              instruction: '飛車を成らせてにゃ！',
              correctMove: { from: { row: 2, col: 4 }, to: { row: 0, col: 4 }, promote: true },
            },
          ],
        },
      ],
    },
    {
      id: 'kaku',
      title: '角の動かし方',
      lessons: [
        {
          id: 'kaku-basics',
          title: '角の動き方',
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
        {
          id: 'kaku-diagonal',
          title: '角の対角移動',
          status: 'locked',
          problems: [
            {
              id: 'kaku-dia-1',
              sfen: '9/9/9/9/4B4/9/9/9/9 b - 1',
              instruction: '角を逆方向に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 0, col: 8 } },
            },
          ],
        },
        {
          id: 'kaku-promote',
          title: '角を成る（馬）',
          status: 'locked',
          problems: [
            {
              id: 'kaku-pro-1',
              sfen: '9/9/4B4/9/9/9/9/9/9 b - 1',
              instruction: '角を成らせてにゃ！',
              correctMove: { from: { row: 2, col: 4 }, to: { row: 0, col: 2 }, promote: true },
            },
          ],
        },
      ],
    },
    {
      id: 'ou',
      title: '王の動かし方',
      lessons: [
        {
          id: 'ou-basics',
          title: '王の動き方',
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
        {
          id: 'ou-escape',
          title: '王の逃げ方',
          status: 'locked',
          problems: [
            {
              id: 'ou-esc-1',
              sfen: '9/9/9/9/4K4/9/9/9/9 b - 1',
              instruction: '王を斜めに逃げてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } },
            },
          ],
        },
        {
          id: 'ou-safety',
          title: '王の安全',
          status: 'locked',
          problems: [
            {
              id: 'ou-saf-1',
              sfen: '9/9/9/9/4K4/9/9/9/9 b - 1',
              instruction: '王を安全な場所に動かしてにゃ！',
              correctMove: { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } },
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
  status: 'locked',
  progress: 0,
  sections: [],
}

const JOSEKI_INTRO_COURSE: Course = {
  id: 'joseki-intro',
  title: '定跡入門',
  description: '序盤の基本的な駒組みを学ぼう',
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
