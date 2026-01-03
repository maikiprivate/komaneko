/**
 * レッスンサービス（ユーザー向け、読み取り専用）
 */

import { AppError } from '../../shared/errors/AppError.js'
import type {
  LessonReadRepository,
  CourseWithNested,
  LessonWithProblems,
} from './lesson.repository.js'

/** コース進捗情報 */
export interface CourseProgress {
  courseId: string
  completedLessons: number
  totalLessons: number
  progressPercent: number
}

export class LessonService {
  constructor(private repository: LessonReadRepository) {}

  /**
   * 公開中のコース一覧を取得
   */
  async getAllCourses(): Promise<CourseWithNested[]> {
    return this.repository.findAllPublishedCourses()
  }

  /**
   * ユーザーの全コース進捗を取得
   */
  async getCoursesProgress(userId: string): Promise<CourseProgress[]> {
    const [courses, completedLessonIds] = await Promise.all([
      this.repository.findAllPublishedCourses(),
      this.repository.findCompletedLessonIds(userId),
    ])

    const completedSet = new Set(completedLessonIds)

    return courses.map((course) => {
      // コース内の全レッスンIDを取得
      const lessonIds = course.sections.flatMap((s) =>
        s.lessons.map((l) => l.id)
      )
      const totalLessons = lessonIds.length
      const completedLessons = lessonIds.filter((id) =>
        completedSet.has(id)
      ).length
      const progressPercent =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0

      return {
        courseId: course.id,
        completedLessons,
        totalLessons,
        progressPercent,
      }
    })
  }

  /**
   * コースの詳細を取得（公開中のみ）
   */
  async getCourseById(id: string): Promise<CourseWithNested> {
    const course = await this.repository.findPublishedCourseById(id)

    if (!course) {
      throw new AppError('COURSE_NOT_FOUND')
    }

    return course
  }

  /**
   * レッスンの詳細を取得（親コースが公開中のみ）
   */
  async getLessonById(id: string): Promise<LessonWithProblems> {
    const lesson = await this.repository.findLessonById(id)

    if (!lesson) {
      throw new AppError('LESSON_NOT_FOUND')
    }

    // 親コースが公開されていない場合もエラー
    if (lesson.section.course.status !== 'published') {
      throw new AppError('LESSON_NOT_FOUND')
    }

    return lesson
  }
}
