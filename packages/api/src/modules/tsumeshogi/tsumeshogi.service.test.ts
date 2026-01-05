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
      count: vi.fn(),
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
          problemNumber: 1,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tsume-2',
          sfen: '8l/7sk/6ppp/9/9/9/9/9/9 b RG 1',
          moveCount: 5,
          problemNumber: 1,
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
          problemNumber: 1,
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

    it('limit/afterNumberでページネーションできる', async () => {
      const mockProblems = [
        {
          id: 'tsume-1',
          sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
          moveCount: 3,
          problemNumber: 1,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockProblems)

      const result = await service.getAll({ moveCount: 3, limit: 50, afterNumber: 0 })

      expect(result).toHaveLength(1)
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        limit: 50,
        afterNumber: 0,
      })
    })
  })

  describe('getCount', () => {
    it('総件数を取得できる', async () => {
      vi.mocked(mockRepository.count).mockResolvedValue(100)

      const result = await service.getCount({ moveCount: 3 })

      expect(result).toBe(100)
      expect(mockRepository.count).toHaveBeenCalledWith({ moveCount: 3 })
    })

    it('フィルタなしで全件数を取得できる', async () => {
      vi.mocked(mockRepository.count).mockResolvedValue(300)

      const result = await service.getCount()

      expect(result).toBe(300)
      expect(mockRepository.count).toHaveBeenCalledWith({})
    })
  })

  describe('getById', () => {
    it('IDで詰将棋を取得できる', async () => {
      const mockProblem = {
        id: 'tsume-1',
        sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
        moveCount: 3,
        problemNumber: 1,
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
        problemNumber: 1,
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

  describe('getAll with statusFilter', () => {
    it('statusFilter: allの場合はフィルタなしで取得', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, statusFilter: 'all', userId: 'user-1' })

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
      })
      expect(mockRepository.findSolvedTsumeshogiIds).not.toHaveBeenCalled()
      expect(mockRepository.findAttemptedTsumeshogiIds).not.toHaveBeenCalled()
    })

    it('statusFilter: solvedの場合はsolvedのIDのみ取得', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2'])
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, statusFilter: 'solved', userId: 'user-1' })

      expect(mockRepository.findSolvedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['tsume-1', 'tsume-2'],
      })
    })

    it('statusFilter: in_progressの場合はin_progressのIDのみ取得', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1'])
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2', 'tsume-3'])
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, statusFilter: 'in_progress', userId: 'user-1' })

      expect(mockRepository.findSolvedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAttemptedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['tsume-2', 'tsume-3'],
      })
    })

    it('statusFilter: unsolvedの場合はattemptedを除外して取得', async () => {
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2'])
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, statusFilter: 'unsolved', userId: 'user-1' })

      expect(mockRepository.findAttemptedTsumeshogiIds).toHaveBeenCalledWith('user-1')
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        excludeIds: ['tsume-1', 'tsume-2'],
      })
    })

    it('statusFilterがall以外でuserIdがない場合はフィルタなしで取得', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, statusFilter: 'solved' })

      expect(mockRepository.findAll).toHaveBeenCalledWith({ moveCount: 3 })
      expect(mockRepository.findSolvedTsumeshogiIds).not.toHaveBeenCalled()
    })

    it('ページネーションとstatusFilterを組み合わせて使用できる', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2'])
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({
        moveCount: 3,
        statusFilter: 'solved',
        userId: 'user-1',
        limit: 50,
        afterNumber: 0,
      })

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['tsume-1', 'tsume-2'],
        limit: 50,
        afterNumber: 0,
      })
    })

    it('statusFilter: solvedで解答済みがない場合はダミーIDで0件を返す', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue([])
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, statusFilter: 'solved', userId: 'user-1' })

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['__no_match__'],
      })
    })

    it('statusFilter: in_progressで挑戦中がない場合はダミーIDで0件を返す', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1'])
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue(['tsume-1']) // 全て解答済み
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, statusFilter: 'in_progress', userId: 'user-1' })

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['__no_match__'],
      })
    })
  })

  describe('getCount with statusFilter', () => {
    it('statusFilter: solvedの場合はsolvedのIDでカウント', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2'])
      vi.mocked(mockRepository.count).mockResolvedValue(2)

      const result = await service.getCount({ moveCount: 3, statusFilter: 'solved', userId: 'user-1' })

      expect(result).toBe(2)
      expect(mockRepository.count).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['tsume-1', 'tsume-2'],
      })
    })

    it('statusFilter: unsolvedの場合はattemptedを除外してカウント', async () => {
      vi.mocked(mockRepository.findAttemptedTsumeshogiIds).mockResolvedValue(['tsume-1'])
      vi.mocked(mockRepository.count).mockResolvedValue(99)

      const result = await service.getCount({ moveCount: 3, statusFilter: 'unsolved', userId: 'user-1' })

      expect(result).toBe(99)
      expect(mockRepository.count).toHaveBeenCalledWith({
        moveCount: 3,
        excludeIds: ['tsume-1'],
      })
    })
  })

  describe('getAllWithCount', () => {
    it('問題一覧と総件数を同時に取得できる', async () => {
      const mockProblems = [
        {
          id: 'tsume-1',
          sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
          moveCount: 3,
          problemNumber: 1,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockProblems)
      vi.mocked(mockRepository.count).mockResolvedValue(100)

      const result = await service.getAllWithCount({ moveCount: 3, limit: 50 })

      expect(result.problems).toHaveLength(1)
      expect(result.total).toBe(100)
      expect(mockRepository.findAll).toHaveBeenCalledWith({ moveCount: 3, limit: 50 })
      // countにはlimitが渡されるが、リポジトリ側で無視される
      expect(mockRepository.count).toHaveBeenCalledWith({ moveCount: 3, limit: 50 })
    })

    it('カーソル（afterNumber）がcount呼び出しには適用されない', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(100)

      await service.getAllWithCount({ moveCount: 3, limit: 50, afterNumber: 50 })

      // findAllにはafterNumberが渡される
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        limit: 50,
        afterNumber: 50,
      })
      // countにはafterNumberが渡されない（全体件数を返すため）
      expect(mockRepository.count).toHaveBeenCalledWith({
        moveCount: 3,
        limit: 50,
      })
    })

    it('statusFilterとカーソルを組み合わせて使用できる', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1', 'tsume-2', 'tsume-3'])
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(3)

      const result = await service.getAllWithCount({
        moveCount: 3,
        statusFilter: 'solved',
        userId: 'user-1',
        limit: 50,
        afterNumber: 1,
      })

      expect(result.total).toBe(3)
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['tsume-1', 'tsume-2', 'tsume-3'],
        limit: 50,
        afterNumber: 1,
      })
      // countにはafterNumberが含まれない
      expect(mockRepository.count).toHaveBeenCalledWith({
        moveCount: 3,
        includeIds: ['tsume-1', 'tsume-2', 'tsume-3'],
        limit: 50,
      })
    })

    it('IDリストは一度だけ取得される（重複クエリの削減）', async () => {
      vi.mocked(mockRepository.findSolvedTsumeshogiIds).mockResolvedValue(['tsume-1'])
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(1)

      await service.getAllWithCount({
        moveCount: 3,
        statusFilter: 'solved',
        userId: 'user-1',
      })

      // findSolvedTsumeshogiIdsは1回だけ呼ばれる
      expect(mockRepository.findSolvedTsumeshogiIds).toHaveBeenCalledTimes(1)
    })
  })

  describe('カーソルベースページネーション', () => {
    it('afterNumber=0で先頭から取得できる', async () => {
      const mockProblems = [
        {
          id: 'tsume-1',
          sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
          moveCount: 3,
          problemNumber: 1,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockProblems)

      const result = await service.getAll({ moveCount: 3, afterNumber: 0 })

      expect(result).toHaveLength(1)
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        afterNumber: 0,
      })
    })

    it('afterNumberを指定すると指定した問題番号より後の問題を取得する', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3, afterNumber: 50 })

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
        afterNumber: 50,
      })
    })

    it('afterNumber未指定でも正常に取得できる', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])

      await service.getAll({ moveCount: 3 })

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        moveCount: 3,
      })
    })
  })
})
