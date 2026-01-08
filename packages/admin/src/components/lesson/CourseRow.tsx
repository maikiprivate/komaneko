/**
 * コース行コンポーネント
 */

import { useState } from 'react'
import type { Course, CourseStatus } from '../../mocks/lessonData'
import { ActionButton, ChevronIcon, OrderButtons, StatusBadge } from '../common'
import { SectionRow } from './SectionRow'

interface CourseRowProps {
  course: Course
  index: number
  total: number
  onEditCourse: (courseId: string, title: string, description: string, status: CourseStatus) => void
  onEditSection: (sectionId: string, title: string, courseName: string) => void
  onEditLesson: (lessonId: string, title: string, sectionName: string) => void
  onAddSection: (courseId: string, courseName: string) => void
  onAddLesson: (sectionId: string, sectionName: string) => void
  onDeleteLesson: (lessonId: string) => void
  onDeleteSection: (sectionId: string, sectionName: string, lessonCount: number) => void
  onDeleteCourse: (
    courseId: string,
    courseName: string,
    sectionCount: number,
    lessonCount: number,
  ) => void
  onMoveSectionUp: (sectionId: string) => void
  onMoveSectionDown: (sectionId: string) => void
  onMoveCourseUp: (courseId: string) => void
  onMoveCourseDown: (courseId: string) => void
  onMoveLessonUp: (lessonId: string) => void
  onMoveLessonDown: (lessonId: string) => void
}

export function CourseRow({
  course,
  index,
  total,
  onEditCourse,
  onEditSection,
  onEditLesson,
  onAddSection,
  onAddLesson,
  onDeleteLesson,
  onDeleteSection,
  onDeleteCourse,
  onMoveSectionUp,
  onMoveSectionDown,
  onMoveCourseUp,
  onMoveCourseDown,
  onMoveLessonUp,
  onMoveLessonDown,
}: CourseRowProps) {
  const [expanded, setExpanded] = useState(index === 0)
  const sectionCount = course.sections.length
  const lessonCount = course.sections.reduce((sum, s) => sum + s.lessons.length, 0)
  const problemCount = course.sections.reduce(
    (sum, s) => sum + s.lessons.reduce((lsum, l) => lsum + l.problems.length, 0),
    0,
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div
        className="flex items-center py-5 px-6 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mr-4">
          <ChevronIcon expanded={expanded} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-800 leading-normal">
              {course.title}
            </h3>
            <StatusBadge status={course.status} />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {sectionCount}セクション・{lessonCount}レッスン・{problemCount}問
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={(e) => {
              e.stopPropagation()
              onEditCourse(course.id, course.title, course.description, course.status)
            }}
          >
            編集
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteCourse(course.id, course.title, sectionCount, lessonCount)
            }}
          >
            削除
          </ActionButton>
          <OrderButtons
            onMoveUp={() => onMoveCourseUp(course.id)}
            onMoveDown={() => onMoveCourseDown(course.id)}
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
          />
        </div>
      </div>
      {expanded && (
        <div className="px-6 pb-5 pt-3 bg-slate-50/50 border-t border-slate-100">
          {course.sections.map((section, i) => (
            <SectionRow
              key={section.id}
              section={section}
              courseName={course.title}
              index={i}
              total={course.sections.length}
              onEditSection={onEditSection}
              onEditLesson={onEditLesson}
              onAddLesson={onAddLesson}
              onDeleteLesson={onDeleteLesson}
              onDeleteSection={onDeleteSection}
              onMoveUp={onMoveSectionUp}
              onMoveDown={onMoveSectionDown}
              onMoveLessonUp={onMoveLessonUp}
              onMoveLessonDown={onMoveLessonDown}
            />
          ))}
          {course.sections.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
              セクションがありません
            </div>
          )}
          <div className="mt-4">
            <button
              onClick={() => onAddSection(course.id, course.title)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              セクションを追加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
