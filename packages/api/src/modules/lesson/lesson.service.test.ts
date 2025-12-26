/**
 * レッスンサービスのテスト（TDD）
 * ユーザー向け読み取り専用API
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LessonService } from './lesson.service.js'
import type {
  LessonReadRepository,
  CourseWithNested,
  LessonWithProblems,
} from './lesson.repository.js'

describe('LessonService', () => {
  let service: LessonService
  let mockRepository: LessonReadRepository

  const mockDate = new Date('2025-01-01T00:00:00Z')

  const createMockCourse = (
    overrides: Partial<CourseWithNested> = {}
  ): CourseWithNested => ({
    id: 'course-1',
    order: 1,
    title: '駒の動かし方',
    description: '基本的な駒の動き',
    status: 'published',
    createdAt: mockDate,
    updatedAt: mockDate,
    sections: [
      {
        id: 'section-1',
        order: 1,
        title: '歩の動かし方',
        courseId: 'course-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        lessons: [
          {
            id: 'lesson-1',
            order: 1,
            title: '歩を前に進める',
            sectionId: 'section-1',
            createdAt: mockDate,
            updatedAt: mockDate,
            problems: [
              {
                id: 'problem-1',
                order: 1,
                sfen: '9/9/9/9/9/9/9/9/4P4 b - 1',
                playerTurn: 'black',
                moveTree: [],
                instruction: '歩を前に進めましょう',
                lessonId: 'lesson-1',
                createdAt: mockDate,
                updatedAt: mockDate,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  })

  const createMockLesson = (
    overrides: Partial<LessonWithProblems> = {}
  ): LessonWithProblems => ({
    id: 'lesson-1',
    order: 1,
    title: '歩を前に進める',
    sectionId: 'section-1',
    createdAt: mockDate,
    updatedAt: mockDate,
    problems: [
      {
        id: 'problem-1',
        order: 1,
        sfen: '9/9/9/9/9/9/9/9/4P4 b - 1',
        playerTurn: 'black',
        moveTree: [],
        instruction: '歩を前に進めましょう',
        lessonId: 'lesson-1',
        createdAt: mockDate,
        updatedAt: mockDate,
      },
    ],
    section: {
      id: 'section-1',
      order: 1,
      title: '歩の動かし方',
      courseId: 'course-1',
      createdAt: mockDate,
      updatedAt: mockDate,
      course: {
        id: 'course-1',
        order: 1,
        title: '駒の動かし方',
        description: '基本的な駒の動き',
        status: 'published',
        createdAt: mockDate,
        updatedAt: mockDate,
      },
    },
    ...overrides,
  })

  beforeEach(() => {
    mockRepository = {
      findAllPublishedCourses: vi.fn(),
      findPublishedCourseById: vi.fn(),
      findLessonById: vi.fn(),
    }
    service = new LessonService(mockRepository)
  })

  describe('getAllCourses', () => {
    it('公開中のコース一覧を取得できる', async () => {
      const mockCourses = [createMockCourse(), createMockCourse({ id: 'course-2', title: '持ち駒の使い方' })]
      vi.mocked(mockRepository.findAllPublishedCourses).mockResolvedValue(mockCourses)

      const result = await service.getAllCourses()

      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBe('course-1')
      expect(result[0]!.title).toBe('駒の動かし方')
      expect(result[1]!.id).toBe('course-2')
      expect(mockRepository.findAllPublishedCourses).toHaveBeenCalled()
    })

    it('コースが存在しない場合は空配列を返す', async () => {
      vi.mocked(mockRepository.findAllPublishedCourses).mockResolvedValue([])

      const result = await service.getAllCourses()

      expect(result).toHaveLength(0)
    })
  })

  describe('getCourseById', () => {
    it('公開中のコースを取得できる', async () => {
      const mockCourse = createMockCourse()
      vi.mocked(mockRepository.findPublishedCourseById).mockResolvedValue(mockCourse)

      const result = await service.getCourseById('course-1')

      expect(result.id).toBe('course-1')
      expect(result.title).toBe('駒の動かし方')
      expect(result.sections).toHaveLength(1)
      expect(mockRepository.findPublishedCourseById).toHaveBeenCalledWith('course-1')
    })

    it('存在しないコースの場合はCOURSE_NOT_FOUNDエラーをスローする', async () => {
      vi.mocked(mockRepository.findPublishedCourseById).mockResolvedValue(null)

      await expect(service.getCourseById('non-existent')).rejects.toMatchObject({
        code: 'COURSE_NOT_FOUND',
      })
    })
  })

  describe('getLessonById', () => {
    it('公開中コースのレッスンを取得できる', async () => {
      const mockLesson = createMockLesson()
      vi.mocked(mockRepository.findLessonById).mockResolvedValue(mockLesson)

      const result = await service.getLessonById('lesson-1')

      expect(result.id).toBe('lesson-1')
      expect(result.title).toBe('歩を前に進める')
      expect(result.problems).toHaveLength(1)
      expect(mockRepository.findLessonById).toHaveBeenCalledWith('lesson-1')
    })

    it('存在しないレッスンの場合はLESSON_NOT_FOUNDエラーをスローする', async () => {
      vi.mocked(mockRepository.findLessonById).mockResolvedValue(null)

      await expect(service.getLessonById('non-existent')).rejects.toMatchObject({
        code: 'LESSON_NOT_FOUND',
      })
    })

    it('親コースが非公開の場合はLESSON_NOT_FOUNDエラーをスローする', async () => {
      const mockLesson = createMockLesson()
      mockLesson.section.course.status = 'draft'
      vi.mocked(mockRepository.findLessonById).mockResolvedValue(mockLesson)

      await expect(service.getLessonById('lesson-1')).rejects.toMatchObject({
        code: 'LESSON_NOT_FOUND',
      })
    })
  })
})
