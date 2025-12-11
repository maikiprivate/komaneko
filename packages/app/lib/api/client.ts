/**
 * APIクライアント
 *
 * fetch wrapperとして機能し、Authorizationヘッダーの自動付与、
 * エラーハンドリング、レスポンスのJSON解析を行う。
 */

import { getToken } from '../auth/tokenStorage'
import { API_BASE_URL } from './config'

/** APIエラーコード（バックエンドのerrorCodes.tsと対応） */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SESSION_EXPIRED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'USERNAME_ALREADY_EXISTS'
  | 'INVALID_INPUT'
  | 'MISSING_REQUIRED_FIELD'
  | 'USER_NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

/** APIエラーレスポンスの形式 */
interface ApiErrorResponse {
  error: {
    code: ApiErrorCode
    message: string
    details?: Record<string, unknown>
  }
}

/** APIエラークラス */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** APIレスポンスの形式 */
interface ApiResponse<T> {
  data: T
  meta?: { timestamp: string }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
}

/**
 * APIリクエストを実行する
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options

  const requestHeaders: Record<string, string> = {
    ...headers,
  }

  // bodyがある場合のみContent-Typeを設定
  if (body) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  // 認証トークンを自動付与
  if (!skipAuth) {
    const token = await getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    // 204 No Content の場合は空オブジェクトを返す
    if (response.status === 204) {
      return {} as T
    }

    const json = await response.json()

    if (!response.ok) {
      const errorResponse = json as ApiErrorResponse
      throw new ApiError(
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || 'エラーが発生しました',
        errorResponse.error?.details
      )
    }

    // 成功レスポンスの data フィールドを返す
    const successResponse = json as ApiResponse<T>
    return successResponse.data
  } catch (error) {
    // ApiErrorはそのまま再throw
    if (error instanceof ApiError) {
      throw error
    }

    // ネットワークエラー
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('NETWORK_ERROR', 'ネットワークに接続できません')
    }

    // その他の予期しないエラー
    throw new ApiError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'エラーが発生しました'
    )
  }
}

/** APIエラーコードから日本語メッセージを取得 */
export function getErrorMessage(code: ApiErrorCode): string {
  const messages: Record<ApiErrorCode, string> = {
    UNAUTHORIZED: '認証が必要です',
    FORBIDDEN: 'アクセス権限がありません',
    SESSION_EXPIRED: 'セッションが期限切れです',
    INVALID_TOKEN: 'トークンが無効です',
    TOKEN_EXPIRED: 'トークンが期限切れです',
    INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
    EMAIL_ALREADY_EXISTS: 'このメールアドレスは既に使用されています',
    USERNAME_ALREADY_EXISTS: 'このユーザー名は既に使用されています',
    INVALID_INPUT: '入力内容を確認してください',
    MISSING_REQUIRED_FIELD: '必須項目が入力されていません',
    USER_NOT_FOUND: 'ユーザーが見つかりません',
    INTERNAL_ERROR: 'サーバーエラーが発生しました',
    DATABASE_ERROR: 'サーバーエラーが発生しました',
    NETWORK_ERROR: 'ネットワークに接続できません',
    UNKNOWN_ERROR: 'エラーが発生しました',
  }
  return messages[code] || 'エラーが発生しました'
}
