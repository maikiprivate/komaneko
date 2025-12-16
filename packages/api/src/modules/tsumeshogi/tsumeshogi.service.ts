/**
 * 詰将棋サービス（ビジネスロジック）
 */

import type { Tsumeshogi } from '@prisma/client'

import { AppError } from '../../shared/errors/AppError.js'
import type { TsumeshogiRepository } from './tsumeshogi.repository.js'

export class TsumeshogiService {
  constructor(private repository: TsumeshogiRepository) {}

  async getAll(filter?: { moveCount?: number }): Promise<Tsumeshogi[]> {
    return this.repository.findAll(filter ?? {})
  }

  async getById(id: string): Promise<Tsumeshogi> {
    const tsumeshogi = await this.repository.findById(id)

    // 存在しない or 公開されていない場合は404
    if (!tsumeshogi || tsumeshogi.status !== 'published') {
      throw new AppError('TSUMESHOGI_NOT_FOUND')
    }

    return tsumeshogi
  }
}
