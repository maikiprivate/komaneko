/**
 * 駒猫セリフシステム - セリフ選択ロジック
 */

import { getDialoguesForCategory } from './dialogues'
import type {
  DialogueCategory,
  DialogueCondition,
  DialogueEntry,
  SelectDialogueOptions,
  TimeOfDay,
  UserContext,
} from './types'

/**
 * 条件が時間帯にマッチするかチェック
 */
function matchesTimeOfDay(
  condition: DialogueCondition,
  timeOfDay: TimeOfDay
): boolean {
  if (!condition.timeOfDay) return true

  if (Array.isArray(condition.timeOfDay)) {
    return condition.timeOfDay.includes(timeOfDay)
  }
  return condition.timeOfDay === timeOfDay
}

/**
 * 条件が数値範囲にマッチするかチェック
 *
 * value が undefined の場合は true を返す（条件を無視）。
 * これは意図的な設計: コンテキストに値が設定されていない場合、
 * その条件を持つセリフも候補に含める。
 * 例: recentAccuracy が不明でも minAccuracy 条件のセリフを表示可能にする。
 */
function matchesRange(
  value: number | undefined,
  min?: number,
  max?: number
): boolean {
  if (value === undefined) return true
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

/**
 * セリフの条件がコンテキストにマッチするかチェック
 */
function matchesCondition(
  entry: DialogueEntry,
  context: UserContext
): boolean {
  const { condition } = entry
  if (!condition) return true

  // 時間帯チェック
  if (!matchesTimeOfDay(condition, context.timeOfDay)) return false

  // ストリーク日数チェック
  if (
    !matchesRange(
      context.streakDays,
      condition.minStreakDays,
      condition.maxStreakDays
    )
  ) {
    return false
  }

  // 不在日数チェック
  if (
    !matchesRange(
      context.daysAbsent,
      condition.minDaysAbsent,
      condition.maxDaysAbsent
    )
  ) {
    return false
  }

  // 正解率チェック
  if (
    !matchesRange(
      context.recentAccuracy,
      condition.minAccuracy,
      condition.maxAccuracy
    )
  ) {
    return false
  }

  return true
}

/**
 * レアリティに基づいて重み付け選択
 * rarity: 1-100（低いほどレア、100がデフォルト）
 */
function selectByRarity(entries: DialogueEntry[]): DialogueEntry {
  // 各エントリの重みを計算
  const weights = entries.map((e) => e.rarity ?? 100)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  // 重み付けランダム選択
  let random = Math.random() * totalWeight
  for (let i = 0; i < entries.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return entries[i]
    }
  }

  // フォールバック
  return entries[entries.length - 1]
}

/**
 * セリフを選択
 *
 * @param category セリフカテゴリ
 * @param context ユーザーコンテキスト
 * @param options 選択オプション
 * @returns 選択されたセリフ、または見つからない場合はnull
 */
export function selectDialogue(
  category: DialogueCategory,
  context: UserContext,
  options: SelectDialogueOptions = {}
): DialogueEntry | null {
  const { recentlyShown = [], avoidRecentCount = 3 } = options

  // カテゴリのセリフ一覧を取得
  const dialogues = getDialoguesForCategory(category)
  if (dialogues.length === 0) return null

  // 条件にマッチするセリフをフィルタ
  let candidates = dialogues.filter((d) => matchesCondition(d, context))

  // 候補がない場合は条件なしのセリフを使用
  if (candidates.length === 0) {
    candidates = dialogues.filter((d) => !d.condition)
  }

  // それでも候補がない場合はnullを返す（優先度付き選択で次のカテゴリを試す）
  if (candidates.length === 0) {
    return null
  }

  // 最近表示したセリフを除外（候補が十分にある場合のみ）
  const recentSet = new Set(recentlyShown.slice(0, avoidRecentCount))
  const nonRecentCandidates = candidates.filter((d) => !recentSet.has(d.id))

  // 非最近の候補があればそちらを使用、なければ全候補から選択
  const finalCandidates =
    nonRecentCandidates.length > 0 ? nonRecentCandidates : candidates

  // レアリティに基づいて選択
  return selectByRarity(finalCandidates)
}

/**
 * 複数カテゴリから優先度順にセリフを選択
 *
 * 最初にマッチしたカテゴリのセリフを返す
 * 例: comeback → home_greeting の順で試行
 */
export function selectDialogueWithPriority(
  categories: DialogueCategory[],
  context: UserContext,
  options: SelectDialogueOptions = {}
): { category: DialogueCategory; entry: DialogueEntry } | null {
  for (const category of categories) {
    const entry = selectDialogue(category, context, options)
    if (entry) {
      return { category, entry }
    }
  }
  return null
}
