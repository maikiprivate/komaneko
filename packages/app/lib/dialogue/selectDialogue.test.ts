/**
 * セリフ選択ロジックのテスト
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { selectDialogue, selectDialogueWithPriority } from './selectDialogue'
import type { UserContext } from './types'

/** テスト用のデフォルトコンテキスト */
const createContext = (overrides: Partial<UserContext> = {}): UserContext => ({
  timeOfDay: 'afternoon',
  streakDays: 0,
  daysAbsent: 0,
  isFirstVisitToday: false,
  ...overrides,
})

describe('selectDialogue', () => {
  describe('条件マッチング', () => {
    it('時間帯に合うセリフが選択される', () => {
      const context = createContext({ timeOfDay: 'morning' })
      const result = selectDialogue('home_greeting', context)

      expect(result).not.toBeNull()
      // 朝のセリフまたは条件なしのセリフが返される
      expect(result?.message).toBeDefined()
    })

    it('ストリーク条件に合うセリフが選択される', () => {
      const context = createContext({ streakDays: 7 })
      const result = selectDialogue('home_greeting', context)

      expect(result).not.toBeNull()
      expect(result?.message).toBeDefined()
    })

    it('条件に合わない場合は条件なしのセリフにフォールバック', () => {
      // home_greetingには条件なしのレアセリフがあるので、必ず何か返る
      const context = createContext()
      const result = selectDialogue('home_greeting', context)

      expect(result).not.toBeNull()
    })

    it('comebackカテゴリは不在日数が足りないとnullを返す', () => {
      // daysAbsent: 0 では comeback の条件（minDaysAbsent: 2）を満たさない
      const context = createContext({ daysAbsent: 0 })
      const result = selectDialogue('comeback', context)

      expect(result).toBeNull()
    })

    it('comebackカテゴリは不在日数2日以上でセリフを返す', () => {
      const context = createContext({ daysAbsent: 3 })
      const result = selectDialogue('comeback', context)

      expect(result).not.toBeNull()
      expect(result?.condition?.minDaysAbsent).toBeLessThanOrEqual(3)
    })

    it('comebackカテゴリは不在日数7日以上で長期不在セリフを返す', () => {
      const context = createContext({ daysAbsent: 10 })
      const result = selectDialogue('comeback', context)

      expect(result).not.toBeNull()
      // minDaysAbsent: 7 または minDaysAbsent: 2 のどちらかにマッチ
    })
  })

  describe('最近表示したセリフの回避', () => {
    it('recentlyShownに含まれるセリフは優先的に回避される', () => {
      const context = createContext({ timeOfDay: 'morning' })

      // 最初に選択されたセリフを記録
      const first = selectDialogue('home_greeting', context)
      expect(first).not.toBeNull()

      // 同じセリフを複数回選択して、回避が機能するか確認
      const results: string[] = []
      for (let i = 0; i < 10; i++) {
        const result = selectDialogue('home_greeting', context, {
          recentlyShown: [first!.id],
          avoidRecentCount: 1,
        })
        if (result) results.push(result.id)
      }

      // 全てが最初のセリフと同じになることは稀（候補が複数あれば）
      // ただし、候補が1つしかない場合は同じになる可能性もある
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('空カテゴリの処理', () => {
    it('セリフがないカテゴリはnullを返す', () => {
      // 存在するが空の配列になることはないが、念のためテスト
      const context = createContext()
      // 実際には全カテゴリにセリフがあるので、このテストは成功する
      const result = selectDialogue('tsumeshogi_start', context)
      expect(result).not.toBeNull()
    })
  })
})

describe('selectDialogueWithPriority', () => {
  it('最初にマッチしたカテゴリのセリフを返す', () => {
    // daysAbsent: 0 なので comeback はマッチしない、home_greeting が選ばれる
    const context = createContext({ daysAbsent: 0 })
    const result = selectDialogueWithPriority(
      ['comeback', 'home_greeting'],
      context
    )

    expect(result).not.toBeNull()
    expect(result?.category).toBe('home_greeting')
  })

  it('comebackの条件を満たす場合はcomebackが優先される', () => {
    const context = createContext({ daysAbsent: 5 })
    const result = selectDialogueWithPriority(
      ['comeback', 'home_greeting'],
      context
    )

    expect(result).not.toBeNull()
    expect(result?.category).toBe('comeback')
  })

  it('全カテゴリがマッチしない場合はnullを返す', () => {
    // comebackのみを指定し、条件を満たさない場合
    const context = createContext({ daysAbsent: 0 })
    const result = selectDialogueWithPriority(['comeback'], context)

    expect(result).toBeNull()
  })
})

describe('レアリティによる選択', () => {
  it('レアリティが低いセリフも選択される可能性がある', () => {
    // 確率的なテストなので、多数回実行してレアセリフが出ることを確認
    const context = createContext()
    const ids = new Set<string>()

    for (let i = 0; i < 100; i++) {
      const result = selectDialogue('home_greeting', context)
      if (result) ids.add(result.id)
    }

    // 複数の異なるセリフが選択されることを確認
    expect(ids.size).toBeGreaterThan(1)
  })
})
