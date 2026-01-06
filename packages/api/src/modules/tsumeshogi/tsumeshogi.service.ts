/**
 * 詰将棋サービス（ビジネスロジック）
 */

import type { Tsumeshogi } from '@prisma/client'

import { AppError } from '../../shared/errors/AppError.js'
import type { TsumeshogiRepository, FindAllOptions } from './tsumeshogi.repository.js'
import type { TsumeshogiStatus, StatusFilter } from './tsumeshogi.schema.js'

export interface GetAllOptions {
  moveCount?: number
  limit?: number
  afterNumber?: number
  statusFilter?: StatusFilter
  userId?: string
}

export interface GetCountOptions {
  moveCount?: number
  statusFilter?: StatusFilter
  userId?: string
}

export class TsumeshogiService {
  constructor(private repository: TsumeshogiRepository) {}

  async getAll(filter?: GetAllOptions): Promise<Tsumeshogi[]> {
    const repoFilter = await this.buildRepoFilter(filter)
    return this.repository.findAll(repoFilter)
  }

  async getCount(filter?: GetCountOptions): Promise<number> {
    const repoFilter = await this.buildRepoFilter(filter)
    return this.repository.count(repoFilter)
  }

  /**
   * 問題一覧と件数を同時に取得（IDリストを一度だけ取得して重複クエリを削減）
   *
   * statusFilterがall以外の場合、findSolvedTsumeshogiIds等が
   * getAll/getCount両方で呼ばれるのを防ぐ
   */
  async getAllWithCount(
    filter?: GetAllOptions,
  ): Promise<{ problems: Tsumeshogi[]; total: number }> {
    const repoFilter = await this.buildRepoFilter(filter)

    // countには afterNumber を適用しない（全体件数を返す）
    const countFilter = { ...repoFilter }
    delete countFilter.afterNumber

    const [problems, total] = await Promise.all([
      this.repository.findAll(repoFilter),
      this.repository.count(countFilter),
    ])

    return { problems, total }
  }

  /**
   * statusFilterに応じてリポジトリ用フィルタを構築
   */
  private async buildRepoFilter(filter?: GetAllOptions | GetCountOptions): Promise<FindAllOptions> {
    if (!filter) return {}

    const { statusFilter, userId, ...baseFilter } = filter

    // statusFilterがall、未指定、またはuserIdがない場合はフィルタなし
    if (!statusFilter || statusFilter === 'all' || !userId) {
      return baseFilter
    }

    // statusFilterに応じてIDフィルタを構築
    switch (statusFilter) {
      case 'solved': {
        const solvedIds = await this.repository.findSolvedTsumeshogiIds(userId)
        // 空配列の場合は結果0件を意味するダミーIDを設定
        // （リポジトリで空配列は無視されるため）
        if (solvedIds.length === 0) {
          return { ...baseFilter, includeIds: ['__no_match__'] }
        }
        return { ...baseFilter, includeIds: solvedIds }
      }
      case 'in_progress': {
        const [solvedIds, attemptedIds] = await Promise.all([
          this.repository.findSolvedTsumeshogiIds(userId),
          this.repository.findAttemptedTsumeshogiIds(userId),
        ])
        const solvedSet = new Set(solvedIds)
        const inProgressIds = attemptedIds.filter((id) => !solvedSet.has(id))
        // 空配列の場合は結果0件を意味するダミーIDを設定
        if (inProgressIds.length === 0) {
          return { ...baseFilter, includeIds: ['__no_match__'] }
        }
        return { ...baseFilter, includeIds: inProgressIds }
      }
      case 'unsolved': {
        const attemptedIds = await this.repository.findAttemptedTsumeshogiIds(userId)
        return { ...baseFilter, excludeIds: attemptedIds }
      }
      default:
        return baseFilter
    }
  }

  async getById(id: string): Promise<Tsumeshogi> {
    const tsumeshogi = await this.repository.findById(id)

    // 存在しない or 公開されていない場合は404
    if (!tsumeshogi || tsumeshogi.status !== 'published') {
      throw new AppError('TSUMESHOGI_NOT_FOUND')
    }

    return tsumeshogi
  }

  async getStatusMap(userId: string): Promise<Map<string, TsumeshogiStatus>> {
    const [solvedIds, attemptedIds] = await Promise.all([
      this.repository.findSolvedTsumeshogiIds(userId),
      this.repository.findAttemptedTsumeshogiIds(userId),
    ])

    const solvedSet = new Set(solvedIds)
    const statusMap = new Map<string, TsumeshogiStatus>()

    for (const id of attemptedIds) {
      statusMap.set(id, solvedSet.has(id) ? 'solved' : 'in_progress')
    }

    return statusMap
  }
}
