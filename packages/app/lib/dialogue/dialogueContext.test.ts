/**
 * コンテキスト判定のテスト
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import {
  getTimeOfDay,
  getDaysDifference,
  isToday,
  buildUserContext,
} from './dialogueContext'

describe('getTimeOfDay', () => {
  describe('朝 (5:00-10:59)', () => {
    it('5:00は朝', () => {
      const date = new Date('2026-01-11T05:00:00')
      expect(getTimeOfDay(date)).toBe('morning')
    })

    it('10:59は朝', () => {
      const date = new Date('2026-01-11T10:59:00')
      expect(getTimeOfDay(date)).toBe('morning')
    })

    it('7:30は朝', () => {
      const date = new Date('2026-01-11T07:30:00')
      expect(getTimeOfDay(date)).toBe('morning')
    })
  })

  describe('昼 (11:00-16:59)', () => {
    it('11:00は昼', () => {
      const date = new Date('2026-01-11T11:00:00')
      expect(getTimeOfDay(date)).toBe('afternoon')
    })

    it('16:59は昼', () => {
      const date = new Date('2026-01-11T16:59:00')
      expect(getTimeOfDay(date)).toBe('afternoon')
    })

    it('14:00は昼', () => {
      const date = new Date('2026-01-11T14:00:00')
      expect(getTimeOfDay(date)).toBe('afternoon')
    })
  })

  describe('夕方 (17:00-20:59)', () => {
    it('17:00は夕方', () => {
      const date = new Date('2026-01-11T17:00:00')
      expect(getTimeOfDay(date)).toBe('evening')
    })

    it('20:59は夕方', () => {
      const date = new Date('2026-01-11T20:59:00')
      expect(getTimeOfDay(date)).toBe('evening')
    })

    it('19:00は夕方', () => {
      const date = new Date('2026-01-11T19:00:00')
      expect(getTimeOfDay(date)).toBe('evening')
    })
  })

  describe('夜 (21:00-4:59)', () => {
    it('21:00は夜', () => {
      const date = new Date('2026-01-11T21:00:00')
      expect(getTimeOfDay(date)).toBe('night')
    })

    it('4:59は夜', () => {
      const date = new Date('2026-01-11T04:59:00')
      expect(getTimeOfDay(date)).toBe('night')
    })

    it('0:00は夜', () => {
      const date = new Date('2026-01-11T00:00:00')
      expect(getTimeOfDay(date)).toBe('night')
    })

    it('23:59は夜', () => {
      const date = new Date('2026-01-11T23:59:00')
      expect(getTimeOfDay(date)).toBe('night')
    })
  })
})

describe('getDaysDifference', () => {
  it('同じ日は0日差', () => {
    const date1 = new Date('2026-01-11T10:00:00')
    const date2 = new Date('2026-01-11T22:00:00')
    expect(getDaysDifference(date1, date2)).toBe(0)
  })

  it('1日差', () => {
    const date1 = new Date('2026-01-10')
    const date2 = new Date('2026-01-11')
    expect(getDaysDifference(date1, date2)).toBe(1)
  })

  it('7日差', () => {
    const date1 = new Date('2026-01-04')
    const date2 = new Date('2026-01-11')
    expect(getDaysDifference(date1, date2)).toBe(7)
  })

  it('日付の順序は関係ない（絶対値）', () => {
    const date1 = new Date('2026-01-11')
    const date2 = new Date('2026-01-04')
    expect(getDaysDifference(date1, date2)).toBe(7)
  })

  it('月をまたぐ場合', () => {
    const date1 = new Date('2026-01-31')
    const date2 = new Date('2026-02-02')
    expect(getDaysDifference(date1, date2)).toBe(2)
  })

  it('年をまたぐ場合', () => {
    const date1 = new Date('2025-12-31')
    const date2 = new Date('2026-01-01')
    expect(getDaysDifference(date1, date2)).toBe(1)
  })
})

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-11T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('今日の日付はtrue', () => {
    const date = new Date('2026-01-11T08:00:00')
    expect(isToday(date)).toBe(true)
  })

  it('今日の別の時刻もtrue', () => {
    const date = new Date('2026-01-11T23:59:59')
    expect(isToday(date)).toBe(true)
  })

  it('昨日の日付はfalse', () => {
    const date = new Date('2026-01-10T12:00:00')
    expect(isToday(date)).toBe(false)
  })

  it('明日の日付はfalse', () => {
    const date = new Date('2026-01-12T12:00:00')
    expect(isToday(date)).toBe(false)
  })
})

describe('buildUserContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-11T14:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('デフォルト値で構築される', () => {
    const context = buildUserContext({})

    expect(context.timeOfDay).toBe('afternoon') // 14:00
    expect(context.streakDays).toBe(0)
    expect(context.daysAbsent).toBe(0)
    expect(context.isFirstVisitToday).toBe(true)
    expect(context.recentAccuracy).toBeUndefined()
    expect(context.currentHearts).toBeUndefined()
    expect(context.maxHearts).toBeUndefined()
  })

  it('パラメータが正しく反映される', () => {
    const context = buildUserContext({
      streakDays: 5,
      recentAccuracy: 80,
      currentHearts: 3,
      maxHearts: 10,
    })

    expect(context.streakDays).toBe(5)
    expect(context.recentAccuracy).toBe(80)
    expect(context.currentHearts).toBe(3)
    expect(context.maxHearts).toBe(10)
  })

  it('最終訪問日から不在日数を計算', () => {
    const context = buildUserContext({
      lastVisitDate: new Date('2026-01-08'), // 3日前
    })

    expect(context.daysAbsent).toBe(3)
    expect(context.isFirstVisitToday).toBe(true)
  })

  it('今日訪問済みの場合', () => {
    const context = buildUserContext({
      lastVisitDate: new Date('2026-01-11T10:00:00'), // 今日
    })

    expect(context.daysAbsent).toBe(0)
    expect(context.isFirstVisitToday).toBe(false)
  })

  it('lastVisitDateがnullの場合', () => {
    const context = buildUserContext({
      lastVisitDate: null,
    })

    expect(context.daysAbsent).toBe(0)
    expect(context.isFirstVisitToday).toBe(true)
  })
})
