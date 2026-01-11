/**
 * 駒猫セリフシステム - 型定義
 */

/** 時間帯 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/** セリフのカテゴリ */
export type DialogueCategory =
  // ホーム画面
  | 'home_greeting'
  // 詰将棋
  | 'tsumeshogi_start'
  | 'tsumeshogi_correct'
  | 'tsumeshogi_wrong'
  | 'tsumeshogi_hint'
  // レッスン
  | 'lesson_start'
  | 'lesson_correct'
  | 'lesson_wrong'
  | 'lesson_complete'
  | 'lesson_opponent'
  // ストリーク
  | 'streak_continue'
  | 'streak_milestone'
  // 特殊状況
  | 'comeback'
  | 'first_visit'
  | 'low_hearts'

/** セリフの条件 */
export type DialogueCondition = {
  /** 時間帯（指定なしは全時間帯） */
  timeOfDay?: TimeOfDay | TimeOfDay[]
  /** 最小継続日数 */
  minStreakDays?: number
  /** 最大継続日数 */
  maxStreakDays?: number
  /** 最小不在日数 */
  minDaysAbsent?: number
  /** 最大不在日数 */
  maxDaysAbsent?: number
  /** 最小正解率 (0-100) */
  minAccuracy?: number
  /** 最大正解率 (0-100) */
  maxAccuracy?: number
}

/** セリフ定義 */
export type DialogueEntry = {
  /** セリフID（重複回避用） */
  id: string
  /** セリフ本文 */
  message: string
  /** 表示条件（省略時は常に候補） */
  condition?: DialogueCondition
  /** レアリティ（1-100、デフォルト100=通常） */
  rarity?: number
}

/** ユーザーコンテキスト */
export type UserContext = {
  /** 現在の時間帯 */
  timeOfDay: TimeOfDay
  /** 連続学習日数 */
  streakDays: number
  /** 最終訪問からの日数（0=今日） */
  daysAbsent: number
  /** 今日初めての訪問か */
  isFirstVisitToday: boolean
  /** 直近の正解率 (0-100) */
  recentAccuracy?: number
  /** 現在のハート数 */
  currentHearts?: number
  /** 最大ハート数 */
  maxHearts?: number
}

/** セリフ選択オプション */
export type SelectDialogueOptions = {
  /** 最近表示したセリフIDのリスト（重複回避用） */
  recentlyShown?: string[]
  /** 回避する最大件数（デフォルト: 3） */
  avoidRecentCount?: number
}
