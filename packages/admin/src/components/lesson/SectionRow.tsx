/**
 * セクション行コンポーネント
 */

import { useState } from 'react'
import type { Section } from '../../mocks/lessonData'
import { ActionButton, ChevronIcon, OrderButtons } from '../common'
import { LessonRow } from './LessonRow'

interface SectionRowProps {
  section: Section
  courseName: string
  index: number
  total: number
  onEditSection: (sectionId: string, title: string, courseName: string) => void
  onEditLesson: (lessonId: string, title: string, sectionName: string) => void
  onAddLesson: (sectionId: string, sectionName: string) => void
  onDeleteLesson: (lessonId: string) => void
  onDeleteSection: (sectionId: string, sectionName: string, lessonCount: number) => void
  onMoveUp: (sectionId: string) => void
  onMoveDown: (sectionId: string) => void
  onMoveLessonUp: (lessonId: string) => void
  onMoveLessonDown: (lessonId: string) => void
}

export function SectionRow({
  section,
  courseName,
  index,
  total,
  onEditSection,
  onEditLesson,
  onAddLesson,
  onDeleteLesson,
  onDeleteSection,
  onMoveUp,
  onMoveDown,
  onMoveLessonUp,
  onMoveLessonDown,
}: SectionRowProps) {
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
              onEditSection(section.id, section.title, courseName)
            }}
          >
            編集
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteSection(section.id, section.title, lessonCount)
            }}
          >
            削除
          </ActionButton>
          <OrderButtons
            onMoveUp={() => onMoveUp(section.id)}
            onMoveDown={() => onMoveDown(section.id)}
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
              sectionName={section.title}
              index={i}
              total={section.lessons.length}
              onEdit={onEditLesson}
              onDelete={onDeleteLesson}
              onMoveUp={onMoveLessonUp}
              onMoveDown={onMoveLessonDown}
            />
          ))}
          {section.lessons.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">レッスンがありません</div>
          )}
          <div className="py-3 px-5 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => onAddLesson(section.id, section.title)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              レッスンを追加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
