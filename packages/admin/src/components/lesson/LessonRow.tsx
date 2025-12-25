/**
 * レッスン行コンポーネント
 */

import { Link } from 'react-router-dom'
import type { Lesson } from '../../mocks/lessonData'
import { ActionButton, OrderButtons } from '../common'

interface LessonRowProps {
  lesson: Lesson
  sectionName: string
  index: number
  total: number
  onEdit: (lessonId: string, title: string, sectionName: string) => void
  onDelete: (lessonId: string) => void
  onMoveUp: (lessonId: string) => void
  onMoveDown: (lessonId: string) => void
}

export function LessonRow({
  lesson,
  sectionName,
  index,
  total,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: LessonRowProps) {
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
        <ActionButton
          onClick={() => onEdit(lesson.id, lesson.title, sectionName)}
        >
          編集
        </ActionButton>
        <ActionButton
          variant="danger"
          onClick={() => {
            if (window.confirm(`「${lesson.title}」を削除しますか？`)) {
              onDelete(lesson.id)
            }
          }}
        >
          削除
        </ActionButton>
        <OrderButtons
          onMoveUp={() => onMoveUp(lesson.id)}
          onMoveDown={() => onMoveDown(lesson.id)}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
        />
      </div>
    </div>
  )
}
