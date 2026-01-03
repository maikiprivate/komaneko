/**
 * 詰将棋サービス（ビジネスロジック）
 */

import type { Tsumeshogi } from '@prisma/client'

import { AppError } from '../../shared/errors/AppError.js'
import type { TsumeshogiRepository } from './tsumeshogi.repository.js'
import type { TsumeshogiStatus } from './tsumeshogi.schema.js'

export interface GetAllOptions {
  moveCount?: number
  limit?: number
  offset?: number
}

export class TsumeshogiService {
  constructor(private repository: TsumeshogiRepository) {}

  async getAll(filter?: GetAllOptions): Promise<Tsumeshogi[]> {
    return this.repository.findAll(filter ?? {})
  }

  async getCount(filter?: { moveCount?: number }): Promise<number> {
    return this.repository.count(filter)
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
