/**
 * 日付ユーティリティ
 *
 * サーバー側: JST固定（offsetHours: 9）
 * クライアント側: ローカルタイムゾーン（offsetHours省略）
 */

/** JSTのオフセット（時間） */
export const JST_OFFSET_HOURS = 9

/**
 * 指定したタイムゾーンオフセットで日付文字列を取得
 * @param date 基準日時（デフォルト: 現在時刻）
 * @param offsetHours UTCからのオフセット時間（デフォルト: ローカルタイムゾーン）
 * @returns "YYYY-MM-DD" 形式の文字列
 */
export function getDateString(date: Date = new Date(), offsetHours?: number): string {
  if (offsetHours !== undefined) {
    // 指定されたオフセットを使用
    const offsetMs = offsetHours * 60 * 60 * 1000
    const adjustedDate = new Date(date.getTime() + offsetMs)
    return adjustedDate.toISOString().slice(0, 10)
  }
  // ローカルタイムゾーンを使用
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 指定したタイムゾーンオフセットで昨日の日付文字列を取得
 * @param date 基準日時（デフォルト: 現在時刻）
 * @param offsetHours UTCからのオフセット時間（デフォルト: ローカルタイムゾーン）
 * @returns "YYYY-MM-DD" 形式の文字列
 */
export function getYesterdayDateString(date: Date = new Date(), offsetHours?: number): string {
  const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000)
  return getDateString(yesterday, offsetHours)
}

/**
 * DateをJSTの日付文字列に変換
 * @param date 変換する日時
 * @returns "YYYY-MM-DD" 形式の文字列
 */
export function dateToJSTString(date: Date): string {
  return getDateString(date, JST_OFFSET_HOURS)
}

/**
 * YYYY-MM-DD形式の文字列をDateにパース（ローカルタイムゾーン）
 * @param dateStr "YYYY-MM-DD" 形式の文字列
 * @returns Date
 */
export function parseDateString(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return new Date(year, month - 1, day)
}
