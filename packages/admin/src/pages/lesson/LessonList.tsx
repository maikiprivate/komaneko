/**
 * レッスン管理一覧ページ
 *
 * コース → セクション → レッスン のネスト型テーブル
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  mockCourses,
  type Course,
  type Section,
  type Lesson,
} from '../../mocks/lessonData'

/** ステータスバッジ */
function StatusBadge({ status }: { status: Course['status'] }) {
  const styles = {
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    archived: 'bg-slate-50 text-slate-500 border-slate-200',
  }
  const labels = {
    published: '公開中',
    draft: '下書き',
    archived: 'アーカイブ',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'published' ? 'bg-emerald-500' :
        status === 'draft' ? 'bg-amber-500' : 'bg-slate-400'
      }`} />
      {labels[status]}
    </span>
  )
}

/** 展開/折りたたみアイコン */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <div className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
      expanded ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
    }`}>
      <svg
        className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

/** アクションボタン */
function ActionButton({
  children,
  variant = 'secondary',
  onClick,
  disabled,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    danger: 'bg-white text-red-600 border border-slate-200 hover:bg-red-50 hover:border-red-200',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${styles[variant]} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

/** 上下ボタン */
function OrderButtons({
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onMoveUp()
        }}
        disabled={!canMoveUp}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        title="上に移動"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onMoveDown()
        }}
        disabled={!canMoveDown}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        title="下に移動"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}

/** レッスン行 */
function LessonRow({
  lesson,
  index,
  total,
}: {
  lesson: Lesson
  index: number
  total: number
}) {
  return (
    <div className="flex items-center py-3.5 px-5 bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
      <div className="w-6 flex justify-center mr-3">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-700 leading-relaxed">{lesson.title}</span>
        <span className="ml-3 text-xs text-slate-400">
          {lesson.problems.length}問
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/lessons/problems/${lesson.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ActionButton variant="primary">問題編集</ActionButton>
        </Link>
        <OrderButtons
          onMoveUp={() => console.log('move up lesson', lesson.id)}
          onMoveDown={() => console.log('move down lesson', lesson.id)}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
        />
      </div>
    </div>
  )
}

/** セクション行 */
function SectionRow({
  section,
  index,
  total,
}: {
  section: Section
  index: number
  total: number
}) {
  const [expanded, setExpanded] = useState(true)
  const lessonCount = section.lessons.length
  const problemCount = section.lessons.reduce((sum, l) => sum + l.problems.length, 0)

  return (
    <div className="mb-2 last:mb-0">
      <div
        className="flex items-center py-3.5 px-5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mr-3">
          <ChevronIcon expanded={expanded} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-slate-700 leading-relaxed">{section.title}</span>
          <span className="ml-4 text-xs text-slate-400">
            {lessonCount}レッスン・{problemCount}問
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={(e) => {
              e.stopPropagation()
              console.log('edit section', section.id)
            }}
          >
            編集
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              console.log('delete section', section.id)
            }}
          >
            削除
          </ActionButton>
          <OrderButtons
            onMoveUp={() => console.log('move up section', section.id)}
            onMoveDown={() => console.log('move down section', section.id)}
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
          />
        </div>
      </div>
      {expanded && (
        <div className="mt-2 ml-9 bg-white rounded-lg border border-slate-200 overflow-hidden">
          {section.lessons.map((lesson, i) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={i}
              total={section.lessons.length}
            />
          ))}
          {section.lessons.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">
              レッスンがありません
            </div>
          )}
          <div className="py-3 px-5 bg-slate-50 border-t border-slate-100">
            <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              レッスンを追加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** コース行 */
function CourseRow({
  course,
  index,
  total,
}: {
  course: Course
  index: number
  total: number
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const sectionCount = course.sections.length
  const lessonCount = course.sections.reduce((sum, s) => sum + s.lessons.length, 0)
  const problemCount = course.sections.reduce(
    (sum, s) => sum + s.lessons.reduce((lsum, l) => lsum + l.problems.length, 0),
    0
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
            <h3 className="text-base font-semibold text-slate-800 leading-normal">{course.title}</h3>
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
              console.log('edit course', course.id)
            }}
          >
            編集
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              console.log('delete course', course.id)
            }}
          >
            削除
          </ActionButton>
          <OrderButtons
            onMoveUp={() => console.log('move up course', course.id)}
            onMoveDown={() => console.log('move down course', course.id)}
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
              index={i}
              total={course.sections.length}
            />
          ))}
          {course.sections.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
              セクションがありません
            </div>
          )}
          <div className="mt-4">
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              セクションを追加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** メインコンポーネント */
export function LessonList() {
  const [courses] = useState(mockCourses)

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
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm">
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
    </div>
  )
}
