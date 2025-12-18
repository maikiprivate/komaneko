/**
 * 認証済みユーザーID取得ヘルパー
 */

import type { FastifyRequest } from 'fastify'

import { AppError } from '../errors/AppError.js'

/**
 * 認証済みユーザーIDを取得する
 *
 * @throws AppError('UNAUTHORIZED') - 認証されていない場合
 */
export function getAuthenticatedUserId(request: FastifyRequest): string {
  if (!request.user) {
    throw new AppError('UNAUTHORIZED')
  }
  return request.user.userId
}
