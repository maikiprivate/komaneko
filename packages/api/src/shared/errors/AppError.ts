import { type ErrorCode, ErrorCodes } from './errorCodes.js'

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, details?: Record<string, unknown>) {
    const errorInfo = ErrorCodes[code]
    super(errorInfo.message)

    this.code = code
    this.statusCode = errorInfo.status
    this.details = details
    this.name = 'AppError'

    // スタックトレースを正しく保持
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }
}
