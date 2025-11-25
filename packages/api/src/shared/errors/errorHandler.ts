import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from './AppError.js'

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // AppError の場合
  if (error instanceof AppError) {
    request.log.warn({ err: error, code: error.code }, 'Application error')
    return reply.status(error.statusCode).send({
      error: error.toJSON(),
    })
  }

  // バリデーションエラー（Fastify/Zod）
  if (error.validation) {
    request.log.warn({ err: error }, 'Validation error')
    return reply.status(400).send({
      error: {
        code: 'INVALID_INPUT',
        message: '入力が不正です',
        details: error.validation,
      },
    })
  }

  // その他のエラー（予期しないエラー）
  request.log.error({ err: error }, 'Unexpected error')
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'サーバーエラーが発生しました',
    },
  })
}
