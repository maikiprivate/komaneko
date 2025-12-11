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
 * リクエストヘッダーを構築する（内部用）
 */
async function buildRequestHeaders(
  body: unknown,
  headers: Record<string, string>,
  skipAuth: boolean
): Promise<Record<string, string>> {
  const requestHeaders: Record<string, string> = { ...headers }

  if (body) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  if (!skipAuth) {
    const token = await getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  return requestHeaders
}

/**
 * fetchレスポンスのエラーをハンドリングする（内部用）
 */
function handleFetchError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error
  }

  // ネットワークエラー（React Native環境対応）
  if (
    error instanceof TypeError &&
    (error.message.includes('fetch') || error.message.includes('Network request failed'))
  ) {
    throw new ApiError('NETWORK_ERROR', 'ネットワークに接続できません')
  }

  throw new ApiError(
    'UNKNOWN_ERROR',
    error instanceof Error ? error.message : 'エラーが発生しました'
  )
}

/**
 * APIリクエストを実行する（データを返すエンドポイント用）
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options
  const requestHeaders = await buildRequestHeaders(body, headers, skipAuth)
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await response.json()

    if (!response.ok) {
      const errorResponse = json as ApiErrorResponse
      throw new ApiError(
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || 'エラーが発生しました',
        errorResponse.error?.details
      )
    }

    const successResponse = json as ApiResponse<T>
    return successResponse.data
  } catch (error) {
    handleFetchError(error)
  }
}

/**
 * APIリクエストを実行する（レスポンスボディを返さないエンドポイント用）
 *
 * logout, deleteAccountなど、成功時にデータを返さないAPIに使用。
 * 204 No Contentや空のレスポンスボディを正しくハンドリングする。
 */
export async function apiRequestVoid(
  endpoint: string,
  options: RequestOptions = {}
): Promise<void> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options
  const requestHeaders = await buildRequestHeaders(body, headers, skipAuth)
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    // 204 No Content または成功ステータスで空ボディの場合
    if (response.status === 204 || response.ok) {
      // レスポンスボディがあればエラーチェックのみ行う
      const text = await response.text()
      if (text && !response.ok) {
        const json = JSON.parse(text) as ApiErrorResponse
        throw new ApiError(
          json.error?.code || 'UNKNOWN_ERROR',
          json.error?.message || 'エラーが発生しました',
          json.error?.details
        )
      }
      return
    }

    // エラーレスポンス
    const json = await response.json()
    const errorResponse = json as ApiErrorResponse
    throw new ApiError(
      errorResponse.error?.code || 'UNKNOWN_ERROR',
      errorResponse.error?.message || 'エラーが発生しました',
      errorResponse.error?.details
    )
  } catch (error) {
    handleFetchError(error)
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
