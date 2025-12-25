/**
 * レッスン管理リポジトリ（DB操作）
 */

import type {
  Course,
  Section,
  Lesson,
  LessonProblem,
  PrismaClient,
} from '@prisma/client'
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CreateSectionInput,
  UpdateSectionInput,
  CreateLessonInput,
  UpdateLessonInput,
  CreateProblemInput,
  UpdateProblemInput,
} from './lesson.schema.js'

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

/** Section with nested lessons and problems */
export type SectionWithNested = Section & {
  lessons: (Lesson & {
    problems: LessonProblem[]
  })[]
}

/** Lesson with nested problems */
export type LessonWithNested = Lesson & {
  problems: LessonProblem[]
}

// =============================================================================
// リポジトリインターフェース
// =============================================================================

export interface LessonRepository {
  // Course
  findAllCourses(): Promise<CourseWithNested[]>
  findCourseById(id: string): Promise<CourseWithNested | null>
  createCourse(data: CreateCourseInput & { order: number }): Promise<Course>
  updateCourse(id: string, data: UpdateCourseInput): Promise<Course>
  deleteCourse(id: string): Promise<void>
  getMaxCourseOrder(): Promise<number>
  reorderCourses(orderedIds: string[]): Promise<void>

  // Section
  findSectionById(id: string): Promise<SectionWithNested | null>
  createSection(data: CreateSectionInput & { order: number }): Promise<Section>
  updateSection(id: string, data: UpdateSectionInput): Promise<Section>
  deleteSection(id: string): Promise<void>
  getMaxSectionOrder(courseId: string): Promise<number>
  reorderSections(courseId: string, orderedIds: string[]): Promise<void>

  // Lesson
  findLessonById(id: string): Promise<LessonWithNested | null>
  createLesson(data: CreateLessonInput & { order: number }): Promise<Lesson>
  updateLesson(id: string, data: UpdateLessonInput): Promise<Lesson>
  deleteLesson(id: string): Promise<void>
  getMaxLessonOrder(sectionId: string): Promise<number>
  reorderLessons(sectionId: string, orderedIds: string[]): Promise<void>

  // Problem
  findProblemById(id: string): Promise<LessonProblem | null>
  createProblem(data: CreateProblemInput & { order: number }): Promise<LessonProblem>
  updateProblem(id: string, data: UpdateProblemInput): Promise<LessonProblem>
  deleteProblem(id: string): Promise<void>
  getMaxProblemOrder(lessonId: string): Promise<number>
  reorderProblems(lessonId: string, orderedIds: string[]): Promise<void>
}

// =============================================================================
// リポジトリ実装
// =============================================================================

export function createLessonRepository(prisma: PrismaClient): LessonRepository {
  /** ネスト構造を含むinclude設定（sections.lessons.problems） */
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
    // =========================================================================
    // Course
    // =========================================================================

    async findAllCourses(): Promise<CourseWithNested[]> {
      return prisma.course.findMany({
        orderBy: { order: 'asc' },
        include: nestedInclude,
      })
    },

    async findCourseById(id: string): Promise<CourseWithNested | null> {
      return prisma.course.findUnique({
        where: { id },
        include: nestedInclude,
      })
    },

    async createCourse(data: CreateCourseInput & { order: number }): Promise<Course> {
      return prisma.course.create({
        data: {
          order: data.order,
          title: data.title,
          description: data.description ?? '',
          status: data.status ?? 'draft',
        },
      })
    },

    async updateCourse(id: string, data: UpdateCourseInput): Promise<Course> {
      return prisma.course.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status !== undefined && { status: data.status }),
        },
      })
    },

    async deleteCourse(id: string): Promise<void> {
      await prisma.course.delete({ where: { id } })
    },

    async getMaxCourseOrder(): Promise<number> {
      const result = await prisma.course.aggregate({
        _max: { order: true },
      })
      return result._max.order ?? 0
    },

    async reorderCourses(orderedIds: string[]): Promise<void> {
      // 注意: IDの存在確認はService層で事前に行うこと
      // ユニーク制約回避: 一旦負の値に設定してから正の値に更新
      await prisma.$transaction(async (tx) => {
        // Step 1: 全て負の値に
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.course.update({
            where: { id: orderedIds[i] },
            data: { order: -(i + 1) },
          })
        }
        // Step 2: 正の値に戻す
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.course.update({
            where: { id: orderedIds[i] },
            data: { order: i + 1 },
          })
        }
      })
    },

    // =========================================================================
    // Section
    // =========================================================================

    async findSectionById(id: string): Promise<SectionWithNested | null> {
      return prisma.section.findUnique({
        where: { id },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              problems: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      })
    },

    async createSection(data: CreateSectionInput & { order: number }): Promise<Section> {
      return prisma.section.create({
        data: {
          order: data.order,
          title: data.title,
          courseId: data.courseId,
        },
      })
    },

    async updateSection(id: string, data: UpdateSectionInput): Promise<Section> {
      return prisma.section.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
        },
      })
    },

    async deleteSection(id: string): Promise<void> {
      await prisma.section.delete({ where: { id } })
    },

    async getMaxSectionOrder(courseId: string): Promise<number> {
      const result = await prisma.section.aggregate({
        where: { courseId },
        _max: { order: true },
      })
      return result._max.order ?? 0
    },

    async reorderSections(_courseId: string, orderedIds: string[]): Promise<void> {
      // 注意: IDの存在確認と親ID整合性チェックはService層で事前に行うこと
      // ユニーク制約回避: 一旦負の値に設定してから正の値に更新
      await prisma.$transaction(async (tx) => {
        // Step 1: 全て負の値に
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.section.update({
            where: { id: orderedIds[i] },
            data: { order: -(i + 1) },
          })
        }
        // Step 2: 正の値に戻す
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.section.update({
            where: { id: orderedIds[i] },
            data: { order: i + 1 },
          })
        }
      })
    },

    // =========================================================================
    // Lesson
    // =========================================================================

    async findLessonById(id: string): Promise<LessonWithNested | null> {
      return prisma.lesson.findUnique({
        where: { id },
        include: {
          problems: {
            orderBy: { order: 'asc' },
          },
        },
      })
    },

    async createLesson(data: CreateLessonInput & { order: number }): Promise<Lesson> {
      return prisma.lesson.create({
        data: {
          order: data.order,
          title: data.title,
          sectionId: data.sectionId,
        },
      })
    },

    async updateLesson(id: string, data: UpdateLessonInput): Promise<Lesson> {
      return prisma.lesson.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
        },
      })
    },

    async deleteLesson(id: string): Promise<void> {
      await prisma.lesson.delete({ where: { id } })
    },

    async getMaxLessonOrder(sectionId: string): Promise<number> {
      const result = await prisma.lesson.aggregate({
        where: { sectionId },
        _max: { order: true },
      })
      return result._max.order ?? 0
    },

    async reorderLessons(_sectionId: string, orderedIds: string[]): Promise<void> {
      // 注意: IDの存在確認と親ID整合性チェックはService層で事前に行うこと
      // ユニーク制約回避: 一旦負の値に設定してから正の値に更新
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.lesson.update({
            where: { id: orderedIds[i] },
            data: { order: -(i + 1) },
          })
        }
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.lesson.update({
            where: { id: orderedIds[i] },
            data: { order: i + 1 },
          })
        }
      })
    },

    // =========================================================================
    // Problem
    // =========================================================================

    async findProblemById(id: string): Promise<LessonProblem | null> {
      return prisma.lessonProblem.findUnique({
        where: { id },
      })
    },

    async createProblem(data: CreateProblemInput & { order: number }): Promise<LessonProblem> {
      return prisma.lessonProblem.create({
        data: {
          order: data.order,
          sfen: data.sfen,
          playerTurn: data.playerTurn ?? 'black',
          moveTree: data.moveTree ?? [],
          lessonId: data.lessonId,
        },
      })
    },

    async updateProblem(id: string, data: UpdateProblemInput): Promise<LessonProblem> {
      return prisma.lessonProblem.update({
        where: { id },
        data: {
          ...(data.sfen !== undefined && { sfen: data.sfen }),
          ...(data.playerTurn !== undefined && { playerTurn: data.playerTurn }),
          ...(data.moveTree !== undefined && { moveTree: data.moveTree }),
        },
      })
    },

    async deleteProblem(id: string): Promise<void> {
      await prisma.lessonProblem.delete({ where: { id } })
    },

    async getMaxProblemOrder(lessonId: string): Promise<number> {
      const result = await prisma.lessonProblem.aggregate({
        where: { lessonId },
        _max: { order: true },
      })
      return result._max.order ?? 0
    },

    async reorderProblems(_lessonId: string, orderedIds: string[]): Promise<void> {
      // 注意: IDの存在確認と親ID整合性チェックはService層で事前に行うこと
      // ユニーク制約回避: 一旦負の値に設定してから正の値に更新
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.lessonProblem.update({
            where: { id: orderedIds[i] },
            data: { order: -(i + 1) },
          })
        }
        for (let i = 0; i < orderedIds.length; i++) {
          await tx.lessonProblem.update({
            where: { id: orderedIds[i] },
            data: { order: i + 1 },
          })
        }
      })
    },
  }
}
