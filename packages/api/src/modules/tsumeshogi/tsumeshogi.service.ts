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

    if (!tsumeshogi) {
      throw new AppError('TSUMESHOGI_NOT_FOUND')
    }

    return tsumeshogi
  }
}
