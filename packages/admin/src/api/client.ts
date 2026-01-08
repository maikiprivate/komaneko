/**
 * APIクライアント
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface ApiError {
  code: string
  message: string
}

export interface ApiResponse<T> {
  data: T
  meta?: { timestamp: string }
}

export class ApiClientError extends Error {
  code: string
  statusCode: number

  constructor(code: string, message: string, statusCode: number) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * 認証トークンを取得
 */
function getToken(): string | null {
  return localStorage.getItem('token')
}

/**
 * 認証トークンを保存
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

/**
 * 認証トークンを削除
 */
export function clearToken(): void {
  localStorage.removeItem('token')
}

/**
 * APIリクエストを実行
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  // 204 No Content の場合はボディがないため、そのまま返す
  if (response.status === 204) {
    return undefined as T
  }

  const json = await response.json()

  if (!response.ok) {
    const error = json.error as ApiError
    throw new ApiClientError(
      error?.code || 'UNKNOWN_ERROR',
      error?.message || 'Unknown error occurred',
      response.status,
    )
  }

  return json.data as T
}
