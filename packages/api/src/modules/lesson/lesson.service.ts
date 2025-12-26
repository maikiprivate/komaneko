/**
 * レッスンサービス（ユーザー向け、読み取り専用）
 */

import { AppError } from '../../shared/errors/AppError.js'
import type {
  LessonReadRepository,
  CourseWithNested,
  LessonWithProblems,
} from './lesson.repository.js'

export class LessonService {
  constructor(private repository: LessonReadRepository) {}

  /**
   * 公開中のコース一覧を取得
   */
  async getAllCourses(): Promise<CourseWithNested[]> {
    return this.repository.findAllPublishedCourses()
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
