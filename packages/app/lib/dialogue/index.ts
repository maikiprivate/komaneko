/**
 * 駒猫セリフシステム
 *
 * ユーザーのコンテキストに応じて適切なセリフを選択するシステム。
 *
 * ## 基本的な使い方
 *
 * ```tsx
 * import { useDialogue } from '@/lib/dialogue'
 *
 * function HomeScreen() {
 *   const { message } = useDialogue('home_greeting', { streakDays: 5 })
 *   return <KomanekoComment message={message} />
 * }
 * ```
 *
 * ## 優先度付きセリフ選択
 *
 * ```tsx
 * import { useDialogueWithPriority } from '@/lib/dialogue'
 *
 * function HomeScreen() {
 *   // 復帰ユーザーには comeback、それ以外は home_greeting
 *   const { message } = useDialogueWithPriority(
 *     ['comeback', 'home_greeting'],
 *     { lastVisitDate: lastVisit }
 *   )
 *   return <KomanekoComment message={message} />
 * }
 * ```
 *
 * ## セリフの追加方法
 *
 * `dialogues.ts` の該当カテゴリの配列にエントリを追加してください。
 *
 * ```ts
 * {
 *   id: 'unique_id',           // 重複回避用の一意ID
 *   message: 'セリフにゃ〜',    // 表示するセリフ
 *   condition: {               // 表示条件（省略可）
 *     timeOfDay: 'morning',
 *     minStreakDays: 3,
 *   },
 *   rarity: 5,                 // レアリティ（1-100、低いほどレア）
 * }
 * ```
 *
 * ## 新しいカテゴリの追加方法
 *
 * 1. `types.ts` の `DialogueCategory` 型にカテゴリ名を追加
 * 2. `dialogues.ts` にセリフ配列を定義
 * 3. `dialogues.ts` の `dialogueMap` に追加
 * 4. （任意）`useDialogue.ts` の `DEFAULT_MESSAGES` にフォールバックメッセージを追加
 *
 * 例: 'achievement' カテゴリを追加する場合
 *
 * ```ts
 * // types.ts
 * export type DialogueCategory = ... | 'achievement'
 *
 * // dialogues.ts
 * const achievement: DialogueEntry[] = [
 *   { id: 'achievement_1', message: 'すごいにゃ！' },
 * ]
 * export const dialogueMap = { ..., achievement }
 * ```
 */

// 型定義
export type {
  DialogueCategory,
  DialogueCondition,
  DialogueEntry,
  SelectDialogueOptions,
  TimeOfDay,
  UserContext,
} from './types'

// コンテキスト関連
export { buildUserContext, getTimeOfDay } from './dialogueContext'

// セリフ選択
export { selectDialogue, selectDialogueWithPriority } from './selectDialogue'

// Reactフック
export {
  getDialogueMessage,
  useDialogue,
  useDialogueWithContext,
  useDialogueWithPriority,
} from './useDialogue'
