/**
 * レッスン管理サービスのテスト（TDD）
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Course, Lesson, LessonProblem, Section } from '@prisma/client'
import type { CourseWithNested, LessonRepository } from './lesson.repository.js'
import { LessonService } from './lesson.service.js'

// =============================================================================
// モックデータ
// =============================================================================

const mockDate = new Date('2024-01-01')

const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-1',
  order: 1,
  title: 'テストコース',
  description: '',
  status: 'draft',
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
})

const createMockSection = (overrides: Partial<Section> = {}): Section => ({
  id: 'section-1',
  order: 1,
  title: 'テストセクション',
  courseId: 'course-1',
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
})

const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson-1',
  order: 1,
  title: 'テストレッスン',
  sectionId: 'section-1',
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
})

const createMockProblem = (overrides: Partial<LessonProblem> = {}): LessonProblem => ({
  id: 'problem-1',
  order: 1,
  sfen: '9/9/9/9/9/9/9/9/9 b - 1',
  playerTurn: 'black',
  moveTree: [],
  instruction: '',
  explanation: '',
  lessonId: 'lesson-1',
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
})

// =============================================================================
// テスト
// =============================================================================

describe('LessonService', () => {
  let service: LessonService
  let mockRepository: LessonRepository

  beforeEach(() => {
    mockRepository = {
      // Course
      findAllCourses: vi.fn(),
      findCourseById: vi.fn(),
      createCourse: vi.fn(),
      updateCourse: vi.fn(),
      deleteCourse: vi.fn(),
      getMaxCourseOrder: vi.fn(),
      reorderCourses: vi.fn(),
      // Section
      findSectionById: vi.fn(),
      createSection: vi.fn(),
      updateSection: vi.fn(),
      deleteSection: vi.fn(),
      getMaxSectionOrder: vi.fn(),
      reorderSections: vi.fn(),
      // Lesson
      findLessonById: vi.fn(),
      createLesson: vi.fn(),
      updateLesson: vi.fn(),
      deleteLesson: vi.fn(),
      getMaxLessonOrder: vi.fn(),
      reorderLessons: vi.fn(),
      // Problem
      findProblemById: vi.fn(),
      createProblem: vi.fn(),
      updateProblem: vi.fn(),
      deleteProblem: vi.fn(),
      getMaxProblemOrder: vi.fn(),
      reorderProblems: vi.fn(),
    }
    service = new LessonService(mockRepository)
  })

  // ===========================================================================
  // Course
  // ===========================================================================

  describe('Course', () => {
    describe('getAllCourses', () => {
      it('全コースをネスト構造で取得できる', async () => {
        const mockCourses: CourseWithNested[] = [
          { ...createMockCourse(), sections: [] },
          { ...createMockCourse({ id: 'course-2', order: 2 }), sections: [] },
        ]
        vi.mocked(mockRepository.findAllCourses).mockResolvedValue(mockCourses)

        const result = await service.getAllCourses()

        expect(result).toHaveLength(2)
        expect(mockRepository.findAllCourses).toHaveBeenCalled()
      })
    })

    describe('createCourse', () => {
      it('新しいコースを作成できる', async () => {
        vi.mocked(mockRepository.getMaxCourseOrder).mockResolvedValue(2)
        vi.mocked(mockRepository.createCourse).mockResolvedValue(
          createMockCourse({ id: 'new-course', order: 3, title: '新規コース' }),
        )

        const result = await service.createCourse({
          title: '新規コース',
          description: '',
          status: 'draft',
        })

        expect(result.title).toBe('新規コース')
        expect(mockRepository.getMaxCourseOrder).toHaveBeenCalled()
        expect(mockRepository.createCourse).toHaveBeenCalledWith({
          title: '新規コース',
          description: '',
          status: 'draft',
          order: 3,
        })
      })

      it('最初のコースの場合order=1になる', async () => {
        vi.mocked(mockRepository.getMaxCourseOrder).mockResolvedValue(0)
        vi.mocked(mockRepository.createCourse).mockResolvedValue(createMockCourse({ order: 1 }))

        await service.createCourse({ title: 'First', description: '', status: 'draft' })

        expect(mockRepository.createCourse).toHaveBeenCalledWith(
          expect.objectContaining({ order: 1 }),
        )
      })
    })

    describe('updateCourse', () => {
      it('コースを更新できる', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue({
          ...createMockCourse(),
          sections: [],
        })
        vi.mocked(mockRepository.updateCourse).mockResolvedValue(
          createMockCourse({ title: '更新後' }),
        )

        const result = await service.updateCourse('course-1', { title: '更新後' })

        expect(result.title).toBe('更新後')
      })

      it('存在しないコースはCOURSE_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue(null)

        await expect(service.updateCourse('non-existent', { title: 'x' })).rejects.toMatchObject({
          code: 'COURSE_NOT_FOUND',
        })
      })
    })

    describe('deleteCourse', () => {
      it('コースを削除できる', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue({
          ...createMockCourse(),
          sections: [],
        })
        vi.mocked(mockRepository.deleteCourse).mockResolvedValue()

        await service.deleteCourse('course-1')

        expect(mockRepository.deleteCourse).toHaveBeenCalledWith('course-1')
      })

      it('存在しないコースはCOURSE_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue(null)

        await expect(service.deleteCourse('non-existent')).rejects.toMatchObject({
          code: 'COURSE_NOT_FOUND',
        })
      })
    })
  })

  // ===========================================================================
  // Section
  // ===========================================================================

  describe('Section', () => {
    describe('createSection', () => {
      it('新しいセクションを作成できる', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue({
          ...createMockCourse(),
          sections: [],
        })
        vi.mocked(mockRepository.getMaxSectionOrder).mockResolvedValue(1)
        vi.mocked(mockRepository.createSection).mockResolvedValue(createMockSection({ order: 2 }))

        await service.createSection({
          title: '新規セクション',
          courseId: 'course-1',
        })

        expect(mockRepository.createSection).toHaveBeenCalledWith({
          title: '新規セクション',
          courseId: 'course-1',
          order: 2,
        })
      })

      it('存在しないコースにはCOURSE_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue(null)

        await expect(
          service.createSection({
            title: 'x',
            courseId: 'non-existent',
          }),
        ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' })
      })
    })

    describe('updateSection', () => {
      it('セクションを更新できる', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue({
          ...createMockSection(),
          lessons: [],
        })
        vi.mocked(mockRepository.updateSection).mockResolvedValue(
          createMockSection({ title: '更新後' }),
        )

        const result = await service.updateSection('section-1', { title: '更新後' })

        expect(result.title).toBe('更新後')
      })

      it('存在しないセクションはSECTION_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue(null)

        await expect(service.updateSection('non-existent', { title: 'x' })).rejects.toMatchObject({
          code: 'SECTION_NOT_FOUND',
        })
      })
    })

    describe('deleteSection', () => {
      it('セクションを削除できる', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue({
          ...createMockSection(),
          lessons: [],
        })
        vi.mocked(mockRepository.deleteSection).mockResolvedValue()

        await service.deleteSection('section-1')

        expect(mockRepository.deleteSection).toHaveBeenCalledWith('section-1')
      })

      it('存在しないセクションはSECTION_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue(null)

        await expect(service.deleteSection('non-existent')).rejects.toMatchObject({
          code: 'SECTION_NOT_FOUND',
        })
      })
    })
  })

  // ===========================================================================
  // Lesson
  // ===========================================================================

  describe('Lesson', () => {
    describe('createLesson', () => {
      it('新しいレッスンを作成できる', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue({
          ...createMockSection(),
          lessons: [],
        })
        vi.mocked(mockRepository.getMaxLessonOrder).mockResolvedValue(0)
        vi.mocked(mockRepository.createLesson).mockResolvedValue(createMockLesson({ order: 1 }))

        await service.createLesson({
          title: '新規レッスン',
          sectionId: 'section-1',
        })

        expect(mockRepository.createLesson).toHaveBeenCalledWith({
          title: '新規レッスン',
          sectionId: 'section-1',
          order: 1,
        })
      })

      it('存在しないセクションにはSECTION_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue(null)

        await expect(
          service.createLesson({
            title: 'x',
            sectionId: 'non-existent',
          }),
        ).rejects.toMatchObject({ code: 'SECTION_NOT_FOUND' })
      })
    })

    describe('updateLesson', () => {
      it('レッスンを更新できる', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue({
          ...createMockLesson(),
          problems: [],
        })
        vi.mocked(mockRepository.updateLesson).mockResolvedValue(
          createMockLesson({ title: '更新後' }),
        )

        const result = await service.updateLesson('lesson-1', { title: '更新後' })

        expect(result.title).toBe('更新後')
      })

      it('存在しないレッスンはLESSON_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue(null)

        await expect(service.updateLesson('non-existent', { title: 'x' })).rejects.toMatchObject({
          code: 'LESSON_NOT_FOUND',
        })
      })
    })

    describe('deleteLesson', () => {
      it('レッスンを削除できる', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue({
          ...createMockLesson(),
          problems: [],
        })
        vi.mocked(mockRepository.deleteLesson).mockResolvedValue()

        await service.deleteLesson('lesson-1')

        expect(mockRepository.deleteLesson).toHaveBeenCalledWith('lesson-1')
      })

      it('存在しないレッスンはLESSON_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue(null)

        await expect(service.deleteLesson('non-existent')).rejects.toMatchObject({
          code: 'LESSON_NOT_FOUND',
        })
      })
    })
  })

  // ===========================================================================
  // Problem
  // ===========================================================================

  describe('Problem', () => {
    describe('getProblem', () => {
      it('問題を取得できる', async () => {
        vi.mocked(mockRepository.findProblemById).mockResolvedValue(createMockProblem())

        const result = await service.getProblem('problem-1')

        expect(result.id).toBe('problem-1')
      })

      it('存在しない問題はPROBLEM_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findProblemById).mockResolvedValue(null)

        await expect(service.getProblem('non-existent')).rejects.toMatchObject({
          code: 'PROBLEM_NOT_FOUND',
        })
      })
    })

    describe('createProblem', () => {
      it('新しい問題を作成できる', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue({
          ...createMockLesson(),
          problems: [],
        })
        vi.mocked(mockRepository.getMaxProblemOrder).mockResolvedValue(2)
        vi.mocked(mockRepository.createProblem).mockResolvedValue(createMockProblem({ order: 3 }))

        await service.createProblem({
          sfen: '9/9/9/9/9/9/9/9/9 b - 1',
          playerTurn: 'black',
          moveTree: [],
          instruction: '',
          explanation: '',
          lessonId: 'lesson-1',
        })

        expect(mockRepository.createProblem).toHaveBeenCalledWith({
          sfen: '9/9/9/9/9/9/9/9/9 b - 1',
          playerTurn: 'black',
          moveTree: [],
          instruction: '',
          explanation: '',
          lessonId: 'lesson-1',
          order: 3,
        })
      })

      it('存在しないレッスンにはLESSON_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue(null)

        await expect(
          service.createProblem({
            sfen: '9/9/9/9/9/9/9/9/9 b - 1',
            playerTurn: 'black',
            moveTree: [],
            instruction: '',
            explanation: '',
            lessonId: 'non-existent',
          }),
        ).rejects.toMatchObject({ code: 'LESSON_NOT_FOUND' })
      })
    })

    describe('updateProblem', () => {
      it('問題を更新できる', async () => {
        vi.mocked(mockRepository.findProblemById).mockResolvedValue(createMockProblem())
        vi.mocked(mockRepository.updateProblem).mockResolvedValue(
          createMockProblem({ sfen: 'updated b - 1' }),
        )

        const result = await service.updateProblem('problem-1', { sfen: 'updated b - 1' })

        expect(result.sfen).toBe('updated b - 1')
      })

      it('存在しない問題はPROBLEM_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findProblemById).mockResolvedValue(null)

        await expect(service.updateProblem('non-existent', { sfen: 'x' })).rejects.toMatchObject({
          code: 'PROBLEM_NOT_FOUND',
        })
      })
    })

    describe('deleteProblem', () => {
      it('問題を削除できる', async () => {
        vi.mocked(mockRepository.findProblemById).mockResolvedValue(createMockProblem())
        vi.mocked(mockRepository.deleteProblem).mockResolvedValue()

        await service.deleteProblem('problem-1')

        expect(mockRepository.deleteProblem).toHaveBeenCalledWith('problem-1')
      })

      it('存在しない問題はPROBLEM_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findProblemById).mockResolvedValue(null)

        await expect(service.deleteProblem('non-existent')).rejects.toMatchObject({
          code: 'PROBLEM_NOT_FOUND',
        })
      })
    })
  })

  // ===========================================================================
  // Reorder
  // ===========================================================================

  describe('Reorder', () => {
    describe('reorderCourses', () => {
      it('コースを並び替えできる', async () => {
        vi.mocked(mockRepository.findAllCourses).mockResolvedValue([
          { ...createMockCourse({ id: 'course-1' }), sections: [] },
          { ...createMockCourse({ id: 'course-2', order: 2 }), sections: [] },
          { ...createMockCourse({ id: 'course-3', order: 3 }), sections: [] },
        ])
        vi.mocked(mockRepository.reorderCourses).mockResolvedValue()

        await service.reorderCourses(['course-2', 'course-1', 'course-3'])

        expect(mockRepository.reorderCourses).toHaveBeenCalledWith([
          'course-2',
          'course-1',
          'course-3',
        ])
      })

      it('存在しないコースIDはCOURSE_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findAllCourses).mockResolvedValue([
          { ...createMockCourse({ id: 'course-1' }), sections: [] },
        ])

        await expect(service.reorderCourses(['course-1', 'non-existent'])).rejects.toMatchObject({
          code: 'COURSE_NOT_FOUND',
        })
      })
    })

    describe('reorderSections', () => {
      it('セクションを並び替えできる', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue({
          ...createMockCourse(),
          sections: [
            { ...createMockSection({ id: 'section-1' }), lessons: [] },
            { ...createMockSection({ id: 'section-2', order: 2 }), lessons: [] },
          ],
        })
        vi.mocked(mockRepository.reorderSections).mockResolvedValue()

        await service.reorderSections('course-1', ['section-2', 'section-1'])

        expect(mockRepository.reorderSections).toHaveBeenCalledWith('course-1', [
          'section-2',
          'section-1',
        ])
      })

      it('存在しないコースはCOURSE_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue(null)

        await expect(service.reorderSections('non-existent', ['a'])).rejects.toMatchObject({
          code: 'COURSE_NOT_FOUND',
        })
      })

      it('コースに属していないセクションIDはSECTION_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findCourseById).mockResolvedValue({
          ...createMockCourse(),
          sections: [{ ...createMockSection({ id: 'section-1' }), lessons: [] }],
        })

        await expect(
          service.reorderSections('course-1', ['section-1', 'invalid-id']),
        ).rejects.toMatchObject({ code: 'SECTION_NOT_FOUND' })
      })
    })

    describe('reorderLessons', () => {
      it('レッスンを並び替えできる', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue({
          ...createMockSection(),
          lessons: [
            { ...createMockLesson({ id: 'lesson-1' }), problems: [] },
            { ...createMockLesson({ id: 'lesson-2', order: 2 }), problems: [] },
          ],
        })
        vi.mocked(mockRepository.reorderLessons).mockResolvedValue()

        await service.reorderLessons('section-1', ['lesson-2', 'lesson-1'])

        expect(mockRepository.reorderLessons).toHaveBeenCalledWith('section-1', [
          'lesson-2',
          'lesson-1',
        ])
      })

      it('存在しないセクションはSECTION_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue(null)

        await expect(service.reorderLessons('non-existent', ['a'])).rejects.toMatchObject({
          code: 'SECTION_NOT_FOUND',
        })
      })

      it('セクションに属していないレッスンIDはLESSON_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findSectionById).mockResolvedValue({
          ...createMockSection(),
          lessons: [{ ...createMockLesson({ id: 'lesson-1' }), problems: [] }],
        })

        await expect(
          service.reorderLessons('section-1', ['lesson-1', 'invalid-id']),
        ).rejects.toMatchObject({ code: 'LESSON_NOT_FOUND' })
      })
    })

    describe('reorderProblems', () => {
      it('問題を並び替えできる', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue({
          ...createMockLesson(),
          problems: [
            createMockProblem({ id: 'problem-1' }),
            createMockProblem({ id: 'problem-2', order: 2 }),
          ],
        })
        vi.mocked(mockRepository.reorderProblems).mockResolvedValue()

        await service.reorderProblems('lesson-1', ['problem-2', 'problem-1'])

        expect(mockRepository.reorderProblems).toHaveBeenCalledWith('lesson-1', [
          'problem-2',
          'problem-1',
        ])
      })

      it('存在しないレッスンはLESSON_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue(null)

        await expect(service.reorderProblems('non-existent', ['a'])).rejects.toMatchObject({
          code: 'LESSON_NOT_FOUND',
        })
      })

      it('レッスンに属していない問題IDはPROBLEM_NOT_FOUNDエラー', async () => {
        vi.mocked(mockRepository.findLessonById).mockResolvedValue({
          ...createMockLesson(),
          problems: [createMockProblem({ id: 'problem-1' })],
        })

        await expect(
          service.reorderProblems('lesson-1', ['problem-1', 'invalid-id']),
        ).rejects.toMatchObject({ code: 'PROBLEM_NOT_FOUND' })
      })
    })
  })
})
