/**
 * レッスンリポジトリ（ユーザー向け、読み取り専用）
 */

import type { Course, Lesson, LessonProblem, PrismaClient, Section } from '@prisma/client'

// =============================================================================
// 型定義
// =============================================================================

/** Course with nested sections, lessons, problems */
export type CourseWithNested = Course & {
  sections: (Section & {
    lessons: (Lesson & {
      problems: LessonProblem[]
    })[]
  })[]
}

/** Lesson with nested problems */
export type LessonWithProblems = Lesson & {
  problems: LessonProblem[]
  section: Section & {
    course: Course
  }
}

// =============================================================================
// リポジトリインターフェース
// =============================================================================

export interface LessonReadRepository {
  findAllPublishedCourses(): Promise<CourseWithNested[]>
  findPublishedCourseById(id: string): Promise<CourseWithNested | null>
  findLessonById(id: string): Promise<LessonWithProblems | null>
  findCompletedLessonIds(userId: string): Promise<string[]>
}

// =============================================================================
// リポジトリ実装
// =============================================================================

export function createLessonReadRepository(prisma: PrismaClient): LessonReadRepository {
  const nestedInclude = {
    sections: {
      orderBy: { order: 'asc' as const },
      include: {
        lessons: {
          orderBy: { order: 'asc' as const },
          include: {
            problems: {
              orderBy: { order: 'asc' as const },
            },
          },
        },
      },
    },
  } as const

  return {
    async findAllPublishedCourses(): Promise<CourseWithNested[]> {
      return prisma.course.findMany({
        where: { status: 'published' },
        orderBy: { order: 'asc' },
        include: nestedInclude,
      })
    },

    async findPublishedCourseById(id: string): Promise<CourseWithNested | null> {
      return prisma.course.findUnique({
        where: { id, status: 'published' },
        include: nestedInclude,
      })
    },

    async findLessonById(id: string): Promise<LessonWithProblems | null> {
      return prisma.lesson.findUnique({
        where: { id },
        include: {
          problems: {
            orderBy: { order: 'asc' },
          },
          section: {
            include: {
              course: true,
            },
          },
        },
      })
    },

    async findCompletedLessonIds(userId: string): Promise<string[]> {
      const records = await prisma.lessonRecord.findMany({
        where: {
          learningRecord: {
            userId,
          },
        },
        select: {
          lessonId: true,
        },
        distinct: ['lessonId'],
      })
      return records.map((r) => r.lessonId)
    },
  }
}
