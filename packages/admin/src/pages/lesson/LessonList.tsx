/**
 * レッスン管理一覧ページ
 *
 * コース → セクション → レッスン のネスト型テーブル
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  reorderCourses,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  type ApiCourse,
  type ApiSection,
  type ApiLesson,
  type CourseStatus,
} from '../../api/lesson'
import {
  CourseDialog,
  ItemDialog,
  CourseRow,
} from '../../components/lesson'

// =============================================================================
// 型定義（UIコンポーネント用）
// =============================================================================

/** 問題（UI用、既存コンポーネントとの互換性のため） */
interface UiProblem {
  id: string
  order: number
  sfen: string
  instruction: string
  correctMove: { from: { row: number; col: number }; to: { row: number; col: number }; promote?: boolean }
}

/** レッスン（UI用） */
interface UiLesson {
  id: string
  order: number
  title: string
  problems: UiProblem[]
}

/** セクション（UI用） */
interface UiSection {
  id: string
  order: number
  title: string
  lessons: UiLesson[]
}

/** コース（UI用） */
interface UiCourse {
  id: string
  order: number
  title: string
  description: string
  status: CourseStatus
  sections: UiSection[]
}

// =============================================================================
// 変換関数
// =============================================================================

/** APIレッスンをUIレッスンに変換 */
function toUiLesson(apiLesson: ApiLesson): UiLesson {
  return {
    id: apiLesson.id,
    order: apiLesson.order,
    title: apiLesson.title,
    // 問題は一覧では表示しないため空配列
    problems: apiLesson.problems.map(p => ({
      id: p.id,
      order: p.order,
      sfen: p.sfen,
      instruction: '',
      correctMove: { from: { row: 0, col: 0 }, to: { row: 0, col: 0 } },
    })),
  }
}

/** APIセクションをUIセクションに変換 */
function toUiSection(apiSection: ApiSection): UiSection {
  return {
    id: apiSection.id,
    order: apiSection.order,
    title: apiSection.title,
    lessons: apiSection.lessons.map(toUiLesson),
  }
}

/** APIコースをUIコースに変換 */
function toUiCourse(apiCourse: ApiCourse): UiCourse {
  return {
    id: apiCourse.id,
    order: apiCourse.order,
    title: apiCourse.title,
    description: apiCourse.description,
    status: apiCourse.status,
    sections: apiCourse.sections.map(toUiSection),
  }
}

// =============================================================================
// ダイアログ状態
// =============================================================================

/** ダイアログの状態 */
type DialogState =
  | { type: 'none' }
  | { type: 'addCourse' }
  | { type: 'editCourse'; courseId: string; title: string; description: string; status: CourseStatus }
  | { type: 'addSection'; courseId: string; courseName: string }
  | { type: 'editSection'; sectionId: string; title: string; courseName: string }
  | { type: 'addLesson'; sectionId: string; sectionName: string }
  | { type: 'editLesson'; lessonId: string; title: string; sectionName: string }

// =============================================================================
// メインコンポーネント
// =============================================================================

export function LessonList() {
  const [courses, setCourses] = useState<UiCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })

  // データ取得
  const fetchCourses = useCallback(async () => {
    try {
      setError(null)
      const data = await getCourses()
      setCourses(data.map(toUiCourse))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // コース追加
  const handleAddCourse = async (data: { title: string; description: string; status: CourseStatus }) => {
    try {
      await createCourse(data)
      await fetchCourses()
      setDialog({ type: 'none' })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'コースの追加に失敗しました')
    }
  }

  // セクション追加
  const handleAddSection = async (data: { title: string }) => {
    if (dialog.type !== 'addSection') return
    const { courseId } = dialog

    try {
      await createSection({ title: data.title, courseId })
      await fetchCourses()
      setDialog({ type: 'none' })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'セクションの追加に失敗しました')
    }
  }

  // レッスン追加
  const handleAddLesson = async (data: { title: string }) => {
    if (dialog.type !== 'addLesson') return
    const { sectionId } = dialog

    try {
      await createLesson({ title: data.title, sectionId })
      await fetchCourses()
      setDialog({ type: 'none' })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'レッスンの追加に失敗しました')
    }
  }

  // コース編集
  const handleEditCourse = async (data: { title: string; description: string; status: CourseStatus }) => {
    if (dialog.type !== 'editCourse') return
    const { courseId } = dialog

    try {
      await updateCourse(courseId, data)
      await fetchCourses()
      setDialog({ type: 'none' })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'コースの更新に失敗しました')
    }
  }

  // セクション編集
  const handleEditSection = async (data: { title: string }) => {
    if (dialog.type !== 'editSection') return
    const { sectionId } = dialog

    try {
      await updateSection(sectionId, data)
      await fetchCourses()
      setDialog({ type: 'none' })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'セクションの更新に失敗しました')
    }
  }

  // レッスン編集
  const handleEditLesson = async (data: { title: string }) => {
    if (dialog.type !== 'editLesson') return
    const { lessonId } = dialog

    try {
      await updateLesson(lessonId, data)
      await fetchCourses()
      setDialog({ type: 'none' })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'レッスンの更新に失敗しました')
    }
  }

  // レッスン削除
  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId)
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'レッスンの削除に失敗しました')
    }
  }

  // セクション削除
  const handleDeleteSection = async (sectionId: string, sectionName: string, lessonCount: number) => {
    const message = lessonCount > 0
      ? `「${sectionName}」を削除しますか？\n（${lessonCount}件のレッスンも削除されます）`
      : `「${sectionName}」を削除しますか？`
    if (!window.confirm(message)) return

    try {
      await deleteSection(sectionId)
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'セクションの削除に失敗しました')
    }
  }

  // コース削除
  const handleDeleteCourse = async (courseId: string, courseName: string, sectionCount: number, lessonCount: number) => {
    let message = `「${courseName}」を削除しますか？`
    if (sectionCount > 0 || lessonCount > 0) {
      message += `\n（${sectionCount}件のセクション、${lessonCount}件のレッスンも削除されます）`
    }
    if (!window.confirm(message)) return

    try {
      await deleteCourse(courseId)
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'コースの削除に失敗しました')
    }
  }

  // セクション並び替え
  const handleMoveSectionUp = async (sectionId: string) => {
    const course = courses.find(c => c.sections.some(s => s.id === sectionId))
    if (!course) return

    const idx = course.sections.findIndex(s => s.id === sectionId)
    if (idx <= 0) return

    const orderedIds = [...course.sections]
    ;[orderedIds[idx - 1], orderedIds[idx]] = [orderedIds[idx], orderedIds[idx - 1]]

    try {
      await reorderSections(course.id, orderedIds.map(s => s.id))
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : '並び替えに失敗しました')
    }
  }

  const handleMoveSectionDown = async (sectionId: string) => {
    const course = courses.find(c => c.sections.some(s => s.id === sectionId))
    if (!course) return

    const idx = course.sections.findIndex(s => s.id === sectionId)
    if (idx === -1 || idx >= course.sections.length - 1) return

    const orderedIds = [...course.sections]
    ;[orderedIds[idx], orderedIds[idx + 1]] = [orderedIds[idx + 1], orderedIds[idx]]

    try {
      await reorderSections(course.id, orderedIds.map(s => s.id))
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : '並び替えに失敗しました')
    }
  }

  // コース並び替え
  const handleMoveCourseUp = async (courseId: string) => {
    const idx = courses.findIndex(c => c.id === courseId)
    if (idx <= 0) return

    const orderedIds = [...courses]
    ;[orderedIds[idx - 1], orderedIds[idx]] = [orderedIds[idx], orderedIds[idx - 1]]

    try {
      await reorderCourses(orderedIds.map(c => c.id))
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : '並び替えに失敗しました')
    }
  }

  const handleMoveCourseDown = async (courseId: string) => {
    const idx = courses.findIndex(c => c.id === courseId)
    if (idx === -1 || idx >= courses.length - 1) return

    const orderedIds = [...courses]
    ;[orderedIds[idx], orderedIds[idx + 1]] = [orderedIds[idx + 1], orderedIds[idx]]

    try {
      await reorderCourses(orderedIds.map(c => c.id))
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : '並び替えに失敗しました')
    }
  }

  // レッスン並び替え
  const handleMoveLessonUp = async (lessonId: string) => {
    let targetSection: UiSection | undefined
    for (const course of courses) {
      for (const section of course.sections) {
        if (section.lessons.some(l => l.id === lessonId)) {
          targetSection = section
          break
        }
      }
    }
    if (!targetSection) return

    const idx = targetSection.lessons.findIndex(l => l.id === lessonId)
    if (idx <= 0) return

    const orderedIds = [...targetSection.lessons]
    ;[orderedIds[idx - 1], orderedIds[idx]] = [orderedIds[idx], orderedIds[idx - 1]]

    try {
      await reorderLessons(targetSection.id, orderedIds.map(l => l.id))
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : '並び替えに失敗しました')
    }
  }

  const handleMoveLessonDown = async (lessonId: string) => {
    let targetSection: UiSection | undefined
    for (const course of courses) {
      for (const section of course.sections) {
        if (section.lessons.some(l => l.id === lessonId)) {
          targetSection = section
          break
        }
      }
    }
    if (!targetSection) return

    const idx = targetSection.lessons.findIndex(l => l.id === lessonId)
    if (idx === -1 || idx >= targetSection.lessons.length - 1) return

    const orderedIds = [...targetSection.lessons]
    ;[orderedIds[idx], orderedIds[idx + 1]] = [orderedIds[idx + 1], orderedIds[idx]]

    try {
      await reorderLessons(targetSection.id, orderedIds.map(l => l.id))
      await fetchCourses()
    } catch (e) {
      alert(e instanceof Error ? e.message : '並び替えに失敗しました')
    }
  }

  // ローディング中
  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  // エラー時
  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => { setLoading(true); fetchCourses() }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
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
