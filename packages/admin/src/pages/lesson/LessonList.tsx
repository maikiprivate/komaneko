/**
 * レッスン管理一覧ページ
 *
 * コース → セクション → レッスン のネスト型テーブル
 */

import { useState } from 'react'
import {
  mockCourses,
  type Course,
  type Section,
  type Lesson,
  type CourseStatus,
} from '../../mocks/lessonData'
import {
  CourseDialog,
  ItemDialog,
  CourseRow,
} from '../../components/lesson'

/** orderフィールドを配列インデックスに基づいて再計算 */
function reorder<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index + 1 }))
}

/** ダイアログの状態 */
type DialogState =
  | { type: 'none' }
  | { type: 'addCourse' }
  | { type: 'editCourse'; courseId: string; title: string; description: string; status: CourseStatus }
  | { type: 'addSection'; courseId: string; courseName: string }
  | { type: 'editSection'; sectionId: string; title: string; courseName: string }
  | { type: 'addLesson'; sectionId: string; sectionName: string }
  | { type: 'editLesson'; lessonId: string; title: string; sectionName: string }

/** メインコンポーネント */
export function LessonList() {
  const [courses, setCourses] = useState(mockCourses)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })

  // コース追加
  const handleAddCourse = (data: { title: string; description: string; status: CourseStatus }) => {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      order: courses.length + 1,
      title: data.title,
      description: data.description,
      status: data.status,
      sections: [],
    }
    setCourses([...courses, newCourse])
    setDialog({ type: 'none' })
  }

  // セクション追加
  const handleAddSection = (data: { title: string }) => {
    if (dialog.type !== 'addSection') return
    const { courseId } = dialog

    setCourses(courses.map((course) => {
      if (course.id !== courseId) return course
      const newSection: Section = {
        id: crypto.randomUUID(),
        order: course.sections.length + 1,
        title: data.title,
        lessons: [],
      }
      return {
        ...course,
        sections: [...course.sections, newSection],
      }
    }))
    setDialog({ type: 'none' })
  }

  // レッスン追加
  const handleAddLesson = (data: { title: string }) => {
    if (dialog.type !== 'addLesson') return
    const { sectionId } = dialog

    setCourses(courses.map((course) => ({
      ...course,
      sections: course.sections.map((section) => {
        if (section.id !== sectionId) return section
        const newLesson: Lesson = {
          id: crypto.randomUUID(),
          order: section.lessons.length + 1,
          title: data.title,
          problems: [],
        }
        return {
          ...section,
          lessons: [...section.lessons, newLesson],
        }
      }),
    })))
    setDialog({ type: 'none' })
  }

  // コース編集
  const handleEditCourse = (data: { title: string; description: string; status: CourseStatus }) => {
    if (dialog.type !== 'editCourse') return
    const { courseId } = dialog

    setCourses(courses.map((course) => {
      if (course.id !== courseId) return course
      return { ...course, title: data.title, description: data.description, status: data.status }
    }))
    setDialog({ type: 'none' })
  }

  // セクション編集
  const handleEditSection = (data: { title: string }) => {
    if (dialog.type !== 'editSection') return
    const { sectionId } = dialog

    setCourses(courses.map((course) => ({
      ...course,
      sections: course.sections.map((section) => {
        if (section.id !== sectionId) return section
        return { ...section, title: data.title }
      }),
    })))
    setDialog({ type: 'none' })
  }

  // レッスン編集
  const handleEditLesson = (data: { title: string }) => {
    if (dialog.type !== 'editLesson') return
    const { lessonId } = dialog

    setCourses(courses.map((course) => ({
      ...course,
      sections: course.sections.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => {
          if (lesson.id !== lessonId) return lesson
          return { ...lesson, title: data.title }
        }),
      })),
    })))
    setDialog({ type: 'none' })
  }

  // レッスン削除
  const handleDeleteLesson = (lessonId: string) => {
    setCourses(courses.map((course) => ({
      ...course,
      sections: course.sections.map((section) => ({
        ...section,
        lessons: reorder(section.lessons.filter((lesson) => lesson.id !== lessonId)),
      })),
    })))
  }

  // セクション削除
  const handleDeleteSection = (sectionId: string, sectionName: string, lessonCount: number) => {
    const message = lessonCount > 0
      ? `「${sectionName}」を削除しますか？\n（${lessonCount}件のレッスンも削除されます）`
      : `「${sectionName}」を削除しますか？`
    if (!window.confirm(message)) return

    setCourses(courses.map((course) => ({
      ...course,
      sections: reorder(course.sections.filter((section) => section.id !== sectionId)),
    })))
  }

  // コース削除
  const handleDeleteCourse = (courseId: string, courseName: string, sectionCount: number, lessonCount: number) => {
    let message = `「${courseName}」を削除しますか？`
    if (sectionCount > 0 || lessonCount > 0) {
      message += `\n（${sectionCount}件のセクション、${lessonCount}件のレッスンも削除されます）`
    }
    if (!window.confirm(message)) return

    setCourses(reorder(courses.filter((course) => course.id !== courseId)))
  }

  // セクション並び替え
  const handleMoveSectionUp = (sectionId: string) => {
    setCourses(courses.map((course) => {
      const idx = course.sections.findIndex((s) => s.id === sectionId)
      if (idx <= 0) return course
      const newSections = [...course.sections]
      ;[newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]]
      return { ...course, sections: reorder(newSections) }
    }))
  }

  const handleMoveSectionDown = (sectionId: string) => {
    setCourses(courses.map((course) => {
      const idx = course.sections.findIndex((s) => s.id === sectionId)
      if (idx === -1 || idx >= course.sections.length - 1) return course
      const newSections = [...course.sections]
      ;[newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]]
      return { ...course, sections: reorder(newSections) }
    }))
  }

  // コース並び替え
  const handleMoveCourseUp = (courseId: string) => {
    const idx = courses.findIndex((c) => c.id === courseId)
    if (idx <= 0) return
    const newCourses = [...courses]
    ;[newCourses[idx - 1], newCourses[idx]] = [newCourses[idx], newCourses[idx - 1]]
    setCourses(reorder(newCourses))
  }

  const handleMoveCourseDown = (courseId: string) => {
    const idx = courses.findIndex((c) => c.id === courseId)
    if (idx === -1 || idx >= courses.length - 1) return
    const newCourses = [...courses]
    ;[newCourses[idx], newCourses[idx + 1]] = [newCourses[idx + 1], newCourses[idx]]
    setCourses(reorder(newCourses))
  }

  // レッスン並び替え
  const handleMoveLessonUp = (lessonId: string) => {
    setCourses(courses.map((course) => ({
      ...course,
      sections: course.sections.map((section) => {
        const idx = section.lessons.findIndex((l) => l.id === lessonId)
        if (idx <= 0) return section
        const newLessons = [...section.lessons]
        ;[newLessons[idx - 1], newLessons[idx]] = [newLessons[idx], newLessons[idx - 1]]
        return { ...section, lessons: reorder(newLessons) }
      }),
    })))
  }

  const handleMoveLessonDown = (lessonId: string) => {
    setCourses(courses.map((course) => ({
      ...course,
      sections: course.sections.map((section) => {
        const idx = section.lessons.findIndex((l) => l.id === lessonId)
        if (idx === -1 || idx >= section.lessons.length - 1) return section
        const newLessons = [...section.lessons]
        ;[newLessons[idx], newLessons[idx + 1]] = [newLessons[idx + 1], newLessons[idx]]
        return { ...section, lessons: reorder(newLessons) }
      }),
    })))
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">レッスン管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            コース・セクション・レッスンの追加・編集・並び替え
          </p>
        </div>
        <button
          onClick={() => setDialog({ type: 'addCourse' })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          コース追加
        </button>
      </div>

      {/* コース一覧 */}
      <div className="space-y-4">
        {courses.map((course, i) => (
          <CourseRow
            key={course.id}
            course={course}
            index={i}
            total={courses.length}
            onEditCourse={(courseId, title, description, status) =>
              setDialog({ type: 'editCourse', courseId, title, description, status })
            }
            onEditSection={(sectionId, title, courseName) =>
              setDialog({ type: 'editSection', sectionId, title, courseName })
            }
            onEditLesson={(lessonId, title, sectionName) =>
              setDialog({ type: 'editLesson', lessonId, title, sectionName })
            }
            onAddSection={(courseId, courseName) =>
              setDialog({ type: 'addSection', courseId, courseName })
            }
            onAddLesson={(sectionId, sectionName) =>
              setDialog({ type: 'addLesson', sectionId, sectionName })
            }
            onDeleteLesson={handleDeleteLesson}
            onDeleteSection={handleDeleteSection}
            onDeleteCourse={handleDeleteCourse}
            onMoveSectionUp={handleMoveSectionUp}
            onMoveSectionDown={handleMoveSectionDown}
            onMoveCourseUp={handleMoveCourseUp}
            onMoveCourseDown={handleMoveCourseDown}
            onMoveLessonUp={handleMoveLessonUp}
            onMoveLessonDown={handleMoveLessonDown}
          />
        ))}
        {courses.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-slate-500">コースがありません</p>
            <p className="mt-1 text-sm text-slate-400">「+ コース追加」ボタンから追加してください</p>
          </div>
        )}
      </div>

      {/* ダイアログ */}
      {dialog.type === 'addCourse' && (
        <CourseDialog
          onSubmit={handleAddCourse}
          onCancel={() => setDialog({ type: 'none' })}
        />
      )}
      {dialog.type === 'editCourse' && (
        <CourseDialog
          initialValues={{
            title: dialog.title,
            description: dialog.description,
            status: dialog.status,
          }}
          onSubmit={handleEditCourse}
          onCancel={() => setDialog({ type: 'none' })}
        />
      )}
      {dialog.type === 'addSection' && (
        <ItemDialog
          addTitle="セクションを追加"
          editTitle="セクションを編集"
          parentName={dialog.courseName}
          inputLabel="セクション名"
          placeholder="例: 歩の動かし方"
          onSubmit={handleAddSection}
          onCancel={() => setDialog({ type: 'none' })}
        />
      )}
      {dialog.type === 'editSection' && (
        <ItemDialog
          addTitle="セクションを追加"
          editTitle="セクションを編集"
          parentName={dialog.courseName}
          inputLabel="セクション名"
          placeholder="例: 歩の動かし方"
          initialValue={dialog.title}
          onSubmit={handleEditSection}
          onCancel={() => setDialog({ type: 'none' })}
        />
      )}
      {dialog.type === 'addLesson' && (
        <ItemDialog
          addTitle="レッスンを追加"
          editTitle="レッスンを編集"
          parentName={dialog.sectionName}
          inputLabel="レッスン名"
          placeholder="例: 歩の動き方"
          onSubmit={handleAddLesson}
          onCancel={() => setDialog({ type: 'none' })}
        />
      )}
      {dialog.type === 'editLesson' && (
        <ItemDialog
          addTitle="レッスンを追加"
          editTitle="レッスンを編集"
          parentName={dialog.sectionName}
          inputLabel="レッスン名"
          placeholder="例: 歩の動き方"
          initialValue={dialog.title}
          onSubmit={handleEditLesson}
          onCancel={() => setDialog({ type: 'none' })}
        />
      )}
    </div>
  )
}
