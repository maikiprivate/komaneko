/**
 * 駒猫セリフシステム - Reactフック
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { buildUserContext } from './dialogueContext'
import { selectDialogue, selectDialogueWithPriority } from './selectDialogue'
import type { DialogueCategory, UserContext } from './types'

/** 最近表示したセリフの最大記録数 */
const MAX_RECENT_HISTORY = 10

/**
 * セリフ選択フック
 *
 * @example
 * ```tsx
 * const { message, refresh } = useDialogue('home_greeting', {
 *   streakDays: 5,
 *   lastVisitDate: new Date('2026-01-10'),
 * })
 *
 * return <KomanekoComment message={message} />
 * ```
 */
export function useDialogue(
  category: DialogueCategory,
  contextParams: {
    streakDays?: number
    lastVisitDate?: Date | null
    recentAccuracy?: number
    currentHearts?: number
    maxHearts?: number
  } = {}
): {
  message: string
  dialogueId: string | null
  refresh: () => void
} {
  const [dialogueId, setDialogueId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')
  const recentlyShownRef = useRef<string[]>([])

  // 依存配列用に個別プロパティを展開（オブジェクト参照変更による不要な再計算を防止）
  const {
    streakDays,
    lastVisitDate,
    recentAccuracy,
    currentHearts,
    maxHearts,
  } = contextParams

  const selectNewDialogue = useCallback(() => {
    const context = buildUserContext({
      streakDays,
      lastVisitDate,
      recentAccuracy,
      currentHearts,
      maxHearts,
    })
    const entry = selectDialogue(category, context, {
      recentlyShown: recentlyShownRef.current,
    })

    if (entry) {
      setDialogueId(entry.id)
      setMessage(entry.message)

      // 履歴に追加
      recentlyShownRef.current = [
        entry.id,
        ...recentlyShownRef.current.slice(0, MAX_RECENT_HISTORY - 1),
      ]
    }
  }, [category, streakDays, lastVisitDate, recentAccuracy, currentHearts, maxHearts])

  // 初回マウント時に選択
  useEffect(() => {
    selectNewDialogue()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    message,
    dialogueId,
    refresh: selectNewDialogue,
  }
}

/**
 * 優先度付きセリフ選択フック
 *
 * 複数カテゴリから優先度順にセリフを選択。
 * 例: 久しぶりの復帰時は comeback を優先、それ以外は home_greeting
 *
 * @example
 * ```tsx
 * const { message } = useDialogueWithPriority(
 *   ['comeback', 'home_greeting'],
 *   { daysAbsent: 7, streakDays: 0 }
 * )
 * ```
 */
export function useDialogueWithPriority(
  categories: DialogueCategory[],
  contextParams: {
    streakDays?: number
    lastVisitDate?: Date | null
    recentAccuracy?: number
    currentHearts?: number
    maxHearts?: number
  } = {}
): {
  message: string
  dialogueId: string | null
  category: DialogueCategory | null
  refresh: () => void
} {
  const [dialogueId, setDialogueId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')
  const [selectedCategory, setSelectedCategory] =
    useState<DialogueCategory | null>(null)
  const recentlyShownRef = useRef<string[]>([])

  // 依存配列用に個別プロパティを展開（オブジェクト参照変更による不要な再計算を防止）
  const {
    streakDays,
    lastVisitDate,
    recentAccuracy,
    currentHearts,
    maxHearts,
  } = contextParams

  // categories配列を文字列化して比較（配列参照変更による不要な再計算を防止）
  const categoriesKey = categories.join(',')

  const selectNewDialogue = useCallback(() => {
    const context = buildUserContext({
      streakDays,
      lastVisitDate,
      recentAccuracy,
      currentHearts,
      maxHearts,
    })
    const result = selectDialogueWithPriority(categories, context, {
      recentlyShown: recentlyShownRef.current,
    })

    if (result) {
      setDialogueId(result.entry.id)
      setMessage(result.entry.message)
      setSelectedCategory(result.category)

      // 履歴に追加
      recentlyShownRef.current = [
        result.entry.id,
        ...recentlyShownRef.current.slice(0, MAX_RECENT_HISTORY - 1),
      ]
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesKey, streakDays, lastVisitDate, recentAccuracy, currentHearts, maxHearts])

  // 初回マウント時に選択
  useEffect(() => {
    selectNewDialogue()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    message,
    dialogueId,
    category: selectedCategory,
    refresh: selectNewDialogue,
  }
}

/**
 * コンテキストを手動で渡すセリフ選択フック
 *
 * より細かい制御が必要な場合に使用
 */
export function useDialogueWithContext(
  category: DialogueCategory,
  context: UserContext
): {
  message: string
  dialogueId: string | null
  refresh: () => void
} {
  const [dialogueId, setDialogueId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')
  const recentlyShownRef = useRef<string[]>([])

  // 依存配列用に個別プロパティを展開（オブジェクト参照変更による不要な再計算を防止）
  const {
    timeOfDay,
    streakDays,
    daysAbsent,
    isFirstVisitToday,
    recentAccuracy,
    currentHearts,
    maxHearts,
  } = context

  const selectNewDialogue = useCallback(() => {
    const entry = selectDialogue(category, context, {
      recentlyShown: recentlyShownRef.current,
    })

    if (entry) {
      setDialogueId(entry.id)
      setMessage(entry.message)

      recentlyShownRef.current = [
        entry.id,
        ...recentlyShownRef.current.slice(0, MAX_RECENT_HISTORY - 1),
      ]
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, timeOfDay, streakDays, daysAbsent, isFirstVisitToday, recentAccuracy, currentHearts, maxHearts])

  useEffect(() => {
    selectNewDialogue()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    message,
    dialogueId,
    refresh: selectNewDialogue,
  }
}

/** カテゴリ別のデフォルトメッセージ */
const DEFAULT_MESSAGES: Partial<Record<DialogueCategory, string>> = {
  home_greeting: 'こんにちはにゃ！',
  tsumeshogi_start: '詰将棋に挑戦するにゃ！',
  tsumeshogi_correct: '正解にゃ！',
  tsumeshogi_wrong: 'もう一度考えてみるにゃ',
  lesson_start: 'レッスン開始にゃ！',
  lesson_correct: '正解にゃ！',
  lesson_wrong: 'もう一度やってみるにゃ',
  lesson_opponent: '相手の番にゃ...',
}

/** 汎用フォールバックメッセージ */
const FALLBACK_MESSAGE = 'にゃ〜'

/**
 * 単純なセリフ取得（フック外で使用する場合）
 *
 * @example
 * ```ts
 * const message = getDialogueMessage('tsumeshogi_correct', { streakDays: 3 })
 * ```
 */
export function getDialogueMessage(
  category: DialogueCategory,
  contextParams: {
    streakDays?: number
    lastVisitDate?: Date | null
    recentAccuracy?: number
    currentHearts?: number
    maxHearts?: number
  } = {}
): string {
  const context = buildUserContext(contextParams)
  const entry = selectDialogue(category, context)
  return entry?.message ?? DEFAULT_MESSAGES[category] ?? FALLBACK_MESSAGE
}
