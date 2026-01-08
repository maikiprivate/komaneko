/**
 * レッスン管理サービス（ビジネスロジック）
 */

import type { Course, Lesson, LessonProblem, Section } from '@prisma/client'

import { AppError } from '../../../shared/errors/AppError.js'
import type { CourseWithNested, LessonRepository } from './lesson.repository.js'
import type {
  CreateCourseInput,
  CreateLessonInput,
  CreateProblemInput,
  CreateSectionInput,
  UpdateCourseInput,
  UpdateLessonInput,
  UpdateProblemInput,
  UpdateSectionInput,
} from './lesson.schema.js'

export class LessonService {
  constructor(private repository: LessonRepository) {}

  // ===========================================================================
  // Course
  // ===========================================================================

  async getAllCourses(): Promise<CourseWithNested[]> {
    return this.repository.findAllCourses()
  }

  async createCourse(input: CreateCourseInput): Promise<Course> {
    const maxOrder = await this.repository.getMaxCourseOrder()
    return this.repository.createCourse({
      ...input,
      order: maxOrder + 1,
    })
  }

  async updateCourse(id: string, input: UpdateCourseInput): Promise<Course> {
    const course = await this.repository.findCourseById(id)
    if (!course) {
      throw new AppError('COURSE_NOT_FOUND')
    }
    return this.repository.updateCourse(id, input)
  }

  async deleteCourse(id: string): Promise<void> {
    const course = await this.repository.findCourseById(id)
    if (!course) {
      throw new AppError('COURSE_NOT_FOUND')
    }
    await this.repository.deleteCourse(id)
  }

  async reorderCourses(orderedIds: string[]): Promise<void> {
    // 全コースを取得してIDの存在確認
    const courses = await this.repository.findAllCourses()
    const courseIds = new Set(courses.map((c) => c.id))
    for (const id of orderedIds) {
      if (!courseIds.has(id)) {
        throw new AppError('COURSE_NOT_FOUND')
      }
    }
    await this.repository.reorderCourses(orderedIds)
  }

  // ===========================================================================
  // Section
  // ===========================================================================

  async createSection(input: CreateSectionInput): Promise<Section> {
    // 親コースの存在確認
    const course = await this.repository.findCourseById(input.courseId)
    if (!course) {
      throw new AppError('COURSE_NOT_FOUND')
    }

    const maxOrder = await this.repository.getMaxSectionOrder(input.courseId)
    return this.repository.createSection({
      ...input,
      order: maxOrder + 1,
    })
  }

  async updateSection(id: string, input: UpdateSectionInput): Promise<Section> {
    const section = await this.repository.findSectionById(id)
    if (!section) {
      throw new AppError('SECTION_NOT_FOUND')
    }
    return this.repository.updateSection(id, input)
  }

  async deleteSection(id: string): Promise<void> {
    const section = await this.repository.findSectionById(id)
    if (!section) {
      throw new AppError('SECTION_NOT_FOUND')
    }
    await this.repository.deleteSection(id)
  }

  async reorderSections(courseId: string, orderedIds: string[]): Promise<void> {
    const course = await this.repository.findCourseById(courseId)
    if (!course) {
      throw new AppError('COURSE_NOT_FOUND')
    }
    // 渡されたIDが全てこのコースに属しているか検証
    const courseSectionIds = new Set(course.sections.map((s) => s.id))
    for (const id of orderedIds) {
      if (!courseSectionIds.has(id)) {
        throw new AppError('SECTION_NOT_FOUND')
      }
    }
    await this.repository.reorderSections(courseId, orderedIds)
  }

  // ===========================================================================
  // Lesson
  // ===========================================================================

  async createLesson(input: CreateLessonInput): Promise<Lesson> {
    // 親セクションの存在確認
    const section = await this.repository.findSectionById(input.sectionId)
    if (!section) {
      throw new AppError('SECTION_NOT_FOUND')
    }

    const maxOrder = await this.repository.getMaxLessonOrder(input.sectionId)
    return this.repository.createLesson({
      ...input,
      order: maxOrder + 1,
    })
  }

  async updateLesson(id: string, input: UpdateLessonInput): Promise<Lesson> {
    const lesson = await this.repository.findLessonById(id)
    if (!lesson) {
      throw new AppError('LESSON_NOT_FOUND')
    }
    return this.repository.updateLesson(id, input)
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.repository.findLessonById(id)
    if (!lesson) {
      throw new AppError('LESSON_NOT_FOUND')
    }
    await this.repository.deleteLesson(id)
  }

  async reorderLessons(sectionId: string, orderedIds: string[]): Promise<void> {
    const section = await this.repository.findSectionById(sectionId)
    if (!section) {
      throw new AppError('SECTION_NOT_FOUND')
    }
    // 渡されたIDが全てこのセクションに属しているか検証
    const sectionLessonIds = new Set(section.lessons.map((l) => l.id))
    for (const id of orderedIds) {
      if (!sectionLessonIds.has(id)) {
        throw new AppError('LESSON_NOT_FOUND')
      }
    }
    await this.repository.reorderLessons(sectionId, orderedIds)
  }

  // ===========================================================================
  // Problem
  // ===========================================================================

  async getProblem(id: string): Promise<LessonProblem> {
    const problem = await this.repository.findProblemById(id)
    if (!problem) {
      throw new AppError('PROBLEM_NOT_FOUND')
    }
    return problem
  }

  async createProblem(input: CreateProblemInput): Promise<LessonProblem> {
    // 親レッスンの存在確認
    const lesson = await this.repository.findLessonById(input.lessonId)
    if (!lesson) {
      throw new AppError('LESSON_NOT_FOUND')
    }

    const maxOrder = await this.repository.getMaxProblemOrder(input.lessonId)
    return this.repository.createProblem({
      ...input,
      order: maxOrder + 1,
    })
  }

  async updateProblem(id: string, input: UpdateProblemInput): Promise<LessonProblem> {
    const problem = await this.repository.findProblemById(id)
    if (!problem) {
      throw new AppError('PROBLEM_NOT_FOUND')
    }
    return this.repository.updateProblem(id, input)
  }

  async deleteProblem(id: string): Promise<void> {
    const problem = await this.repository.findProblemById(id)
    if (!problem) {
      throw new AppError('PROBLEM_NOT_FOUND')
    }
    await this.repository.deleteProblem(id)
  }

  async reorderProblems(lessonId: string, orderedIds: string[]): Promise<void> {
    const lesson = await this.repository.findLessonById(lessonId)
    if (!lesson) {
      throw new AppError('LESSON_NOT_FOUND')
    }
    // 渡されたIDが全てこのレッスンに属しているか検証
    const lessonProblemIds = new Set(lesson.problems.map((p) => p.id))
    for (const id of orderedIds) {
      if (!lessonProblemIds.has(id)) {
        throw new AppError('PROBLEM_NOT_FOUND')
      }
    }
    await this.repository.reorderProblems(lessonId, orderedIds)
  }
}
