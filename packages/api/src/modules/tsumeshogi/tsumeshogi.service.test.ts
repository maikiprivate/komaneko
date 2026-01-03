/**
 * 詰将棋サービスのテスト（TDD）
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TsumeshogiService } from './tsumeshogi.service.js'
import type { TsumeshogiRepository } from './tsumeshogi.repository.js'

describe('TsumeshogiService', () => {
  let service: TsumeshogiService
  let mockRepository: TsumeshogiRepository

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findSolvedTsumeshogiIds: vi.fn(),
      findAttemptedTsumeshogiIds: vi.fn(),
    }
    service = new TsumeshogiService(mockRepository)
  })

  describe('getAll', () => {
    it('全ての詰将棋を取得できる', async () => {
      const mockProblems = [
        {
          id: 'tsume-1',
          sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
          moveCount: 3,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tsume-2',
          sfen: '8l/7sk/6ppp/9/9/9/9/9/9 b RG 1',
          moveCount: 5,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockProblems)

      const result = await service.getAll()

      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBe('tsume-1')
      expect(result[1]!.id).toBe('tsume-2')
      expect(mockRepository.findAll).toHaveBeenCalledWith({})
    })

    it('手数でフィルタリングできる', async () => {
      const mockProblems = [
        {
          id: 'tsume-1',
          sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
          moveCount: 3,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockProblems)

      const result = await service.getAll({ moveCount: 3 })

      expect(result).toHaveLength(1)
      expect(mockRepository.findAll).toHaveBeenCalledWith({ moveCount: 3 })
    })

    it('空の配列を返す場合がある', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      const result = await service.getAll({ moveCount: 99 })

      expect(result).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('IDで詰将棋を取得できる', async () => {
      const mockProblem = {
        id: 'tsume-1',
        sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
        moveCount: 3,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findById).mockResolvedValue(mockProblem)

      const result = await service.getById('tsume-1')

      expect(result.id).toBe('tsume-1')
      expect(result.sfen).toBe('7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1')
      expect(result.moveCount).toBe(3)
      expect(mockRepository.findById).toHaveBeenCalledWith('tsume-1')
    })

    it('存在しない場合はTSUMESHOGI_NOT_FOUNDエラーをスローする', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getById('non-existent')).rejects.toMatchObject({
        code: 'TSUMESHOGI_NOT_FOUND',
      })
    })

    it('公開されていない場合はTSUMESHOGI_NOT_FOUNDエラーをスローする', async () => {
      const draftProblem = {
        id: 'tsume-draft',
        sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
        moveCount: 3,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findById).mockResolvedValue(draftProblem)

      await expect(service.getById('tsume-draft')).rejects.toMatchObject({
        code: 'TSUMESHOGI_NOT_FOUND',
      })
    })
  })

  describe('getStatusMap', () => {
    it('正解済みの問題はsolvedステータスを返す', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2'])
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2'])

      const result = await service.getStatusMap('user-1')

      expect(result.get('tsume-1')).toBe('solved')
      expect(result.get('tsume-2')).toBe('solved')
      expect(mockRepository.findSolvedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAttemptedTsumeshogiIds).toHaveBeenCalledWith('user-1')
    })

    it('挑戦済みだが未正解の問題はin_progressステータスを返す', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue([])
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2'])

      const result = await service.getStatusMap('user-1')

      expect(result.get('tsume-1')).toBe('in_progress')
      expect(result.get('tsume-2')).toBe('in_progress')
      expect(mockRepository.findSolvedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAttemptedTsumeshogiIds).toHaveBeenCalledWith('user-1')
    })

    it('未挑戦の問題はマップに含まれない（unsolvedはデフォルト値として扱う）', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue([])
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue([])

      const result = await service.getStatusMap('user-1')

      expect(result.size).toBe(0)
      expect(result.get('tsume-1')).toBeUndefined()
      expect(mockRepository.findSolvedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAttemptedTsumeshogiIds).toHaveBeenCalledWith('user-1')
    })

    it('混在するステータスを正しく判定する', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1'])
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2', 'tsume-3'])

      const result = await service.getStatusMap('user-1')

      expect(result.get('tsume-1')).toBe('solved')
      expect(result.get('tsume-2')).toBe('in_progress')
      expect(result.get('tsume-3')).toBe('in_progress')
      expect(mockRepository.findSolvedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAttemptedTsumeshogiIds).toHaveBeenCalledWith('user-1')
    })
  })
})
