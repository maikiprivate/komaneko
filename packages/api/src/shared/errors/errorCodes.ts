// エラーコード定義
// 新しいエラーはここに追加

export const ErrorCodes = {
  // ========== 認証・認可 ==========
  UNAUTHORIZED: { status: 401, message: '認証が必要です' },
  FORBIDDEN: { status: 403, message: 'アクセス権限がありません' },
  SESSION_EXPIRED: { status: 401, message: 'セッションが期限切れです' },
  INVALID_TOKEN: { status: 401, message: 'トークンが無効です' },
  TOKEN_EXPIRED: { status: 401, message: 'トークンが期限切れです' },
  INVALID_CREDENTIALS: { status: 401, message: 'メールアドレスまたはパスワードが正しくありません' },
  EMAIL_ALREADY_EXISTS: { status: 409, message: 'このメールアドレスは既に使用されています' },
  USERNAME_ALREADY_EXISTS: { status: 409, message: 'このユーザー名は既に使用されています' },

  // ========== 設定 ==========
  MISSING_JWT_SECRET: { status: 500, message: 'JWT_SECRETが設定されていません' },

  // ========== バリデーション ==========
  INVALID_INPUT: { status: 400, message: '入力が不正です' },
  MISSING_REQUIRED_FIELD: { status: 400, message: '必須項目が入力されていません' },

  // ========== リソース ==========
  USER_NOT_FOUND: { status: 404, message: 'ユーザーが見つかりません' },
  LESSON_NOT_FOUND: { status: 404, message: 'レッスンが見つかりません' },
  TSUMESHOGI_NOT_FOUND: { status: 404, message: '詰将棋が見つかりません' },

  // ========== ゲーミフィケーション ==========
  NO_HEARTS_LEFT: { status: 400, message: 'ハートがありません' },

  // ========== サーバー ==========
  INTERNAL_ERROR: { status: 500, message: 'サーバーエラーが発生しました' },
  DATABASE_ERROR: { status: 500, message: 'データベースエラーが発生しました' },
} as const

export type ErrorCode = keyof typeof ErrorCodes
