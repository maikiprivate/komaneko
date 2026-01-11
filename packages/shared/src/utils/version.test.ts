import { describe, expect, it } from 'vitest'

import { compareVersions, isValidVersion, parseVersion } from './version.js'

describe('version utils', () => {
  describe('isValidVersion', () => {
    it('有効なバージョン文字列を受け入れる', () => {
      expect(isValidVersion('1.0.0')).toBe(true)
      expect(isValidVersion('1.0')).toBe(true)
      expect(isValidVersion('1')).toBe(true)
      expect(isValidVersion('10.20.30')).toBe(true)
      expect(isValidVersion('0.0.0')).toBe(true)
      expect(isValidVersion('99.99.99')).toBe(true)
    })

    it('無効なバージョン文字列を拒否する', () => {
      expect(isValidVersion('')).toBe(false)
      expect(isValidVersion('   ')).toBe(false)
      expect(isValidVersion('abc')).toBe(false)
      expect(isValidVersion('1.a.0')).toBe(false)
      expect(isValidVersion('1.0.0.0.0')).toBe(true) // 4桁以上も許容
      expect(isValidVersion('1..0')).toBe(false)
      expect(isValidVersion('.1.0')).toBe(false)
      expect(isValidVersion('1.0.')).toBe(false)
      expect(isValidVersion('01.0.0')).toBe(false) // 先頭ゼロは無効
      expect(isValidVersion('-1.0.0')).toBe(false)
    })

    it('null/undefinedを拒否する', () => {
      expect(isValidVersion(null)).toBe(false)
      expect(isValidVersion(undefined)).toBe(false)
    })
  })

  describe('parseVersion', () => {
    it('バージョン文字列を数値配列に変換する', () => {
      expect(parseVersion('1.2.3')).toEqual([1, 2, 3])
      expect(parseVersion('1.0')).toEqual([1, 0])
      expect(parseVersion('10')).toEqual([10])
      expect(parseVersion('0.0.0')).toEqual([0, 0, 0])
    })
  })

  describe('compareVersions', () => {
    it('同じバージョンは0を返す', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
      expect(compareVersions('2.5.10', '2.5.10')).toBe(0)
    })

    it('異なる桁数でも正しく比較する', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0)
      expect(compareVersions('1', '1.0.0')).toBe(0)
      expect(compareVersions('1.0.0', '1')).toBe(0)
    })

    it('a < b の場合 -1 を返す', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1)
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
      expect(compareVersions('1.9.0', '1.10.0')).toBe(-1) // 1.9 < 1.10
      expect(compareVersions('0.1.0', '1.0.0')).toBe(-1)
    })

    it('a > b の場合 1 を返す', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
      expect(compareVersions('1.10.0', '1.9.0')).toBe(1)
      expect(compareVersions('1.0.0', '0.99.99')).toBe(1)
    })

    it('境界ケースを正しく処理する', () => {
      expect(compareVersions('0.0.1', '0.0.0')).toBe(1)
      expect(compareVersions('0.0.0', '0.0.1')).toBe(-1)
      expect(compareVersions('99.99.99', '100.0.0')).toBe(-1)
    })
  })
})
