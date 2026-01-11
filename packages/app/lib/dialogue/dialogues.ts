/**
 * 駒猫セリフシステム - セリフデータ
 *
 * カテゴリごとにセリフを定義。
 * 新しいセリフを追加する場合は該当カテゴリの配列に追加してください。
 */

import type { DialogueCategory, DialogueEntry } from './types'

/**
 * ホーム画面の挨拶
 */
const homeGreeting: DialogueEntry[] = [
  // 朝（5:00-10:59）
  {
    id: 'home_morning_1',
    message: 'おはようにゃ！朝から将棋の勉強、えらいにゃ〜',
    condition: { timeOfDay: 'morning' },
  },
  {
    id: 'home_morning_2',
    message: 'にゃーおはよう！今日も一緒に頑張るにゃ',
    condition: { timeOfDay: 'morning' },
  },
  {
    id: 'home_morning_3',
    message: '早起きは三文の得にゃ！いい一日になるにゃ〜',
    condition: { timeOfDay: 'morning' },
  },
  // 昼（11:00-16:59）
  {
    id: 'home_afternoon_1',
    message: 'お昼休みに将棋にゃ？いい息抜きになるにゃ〜',
    condition: { timeOfDay: 'afternoon' },
  },
  {
    id: 'home_afternoon_2',
    message: '午後も頑張るにゃ！詰将棋で頭をスッキリさせるにゃ',
    condition: { timeOfDay: 'afternoon' },
  },
  {
    id: 'home_afternoon_3',
    message: 'いい天気にゃね〜将棋日和にゃ！',
    condition: { timeOfDay: 'afternoon' },
  },
  // 夕方（17:00-20:59）
  {
    id: 'home_evening_1',
    message: '一日お疲れ様にゃ！リラックスして詰将棋どうにゃ？',
    condition: { timeOfDay: 'evening' },
  },
  {
    id: 'home_evening_2',
    message: '今日もお疲れ様にゃ〜将棋で頭の体操するにゃ？',
    condition: { timeOfDay: 'evening' },
  },
  {
    id: 'home_evening_3',
    message: '夕方の将棋タイムにゃ！今日の締めくくりにどうにゃ？',
    condition: { timeOfDay: 'evening' },
  },
  // 夜（21:00-4:59）
  {
    id: 'home_night_1',
    message: '夜更かし将棋にゃ？無理しないでにゃ〜',
    condition: { timeOfDay: 'night' },
  },
  {
    id: 'home_night_2',
    message: 'こんな時間まで頑張ってるにゃ...えらいにゃ〜',
    condition: { timeOfDay: 'night' },
  },
  {
    id: 'home_night_3',
    message: '静かな夜は集中できるにゃね〜',
    condition: { timeOfDay: 'night' },
  },
  // ストリーク継続中（時間帯問わず）
  {
    id: 'home_streak_3',
    message: '3日連続にゃ！いい習慣になってきたにゃ〜',
    condition: { minStreakDays: 3, maxStreakDays: 6 },
  },
  {
    id: 'home_streak_7',
    message: '一週間続いてるにゃ！すごいにゃ〜',
    condition: { minStreakDays: 7, maxStreakDays: 13 },
  },
  {
    id: 'home_streak_14',
    message: '2週間も続いてるにゃ！尊敬するにゃ〜',
    condition: { minStreakDays: 14, maxStreakDays: 29 },
  },
  {
    id: 'home_streak_30',
    message: '30日達成...！本当にすごいにゃ〜〜！',
    condition: { minStreakDays: 30 },
  },
  // レアセリフ
  {
    id: 'home_rare_1',
    message: '今日はなんだかいい日になりそうにゃ♪',
    rarity: 5,
  },
  {
    id: 'home_rare_2',
    message: '将棋の神様がついてるにゃ！...たぶん',
    rarity: 5,
  },
]

/**
 * 復帰メッセージ
 */
const comeback: DialogueEntry[] = [
  {
    id: 'comeback_short_1',
    message: 'おかえりにゃ！待ってたにゃ〜',
    condition: { minDaysAbsent: 2, maxDaysAbsent: 6 },
  },
  {
    id: 'comeback_short_2',
    message: 'また来てくれて嬉しいにゃ！',
    condition: { minDaysAbsent: 2, maxDaysAbsent: 6 },
  },
  {
    id: 'comeback_long_1',
    message: '久しぶりにゃ！会いたかったにゃ〜',
    condition: { minDaysAbsent: 7 },
  },
  {
    id: 'comeback_long_2',
    message: 'にゃーん！元気だったにゃ？また一緒に頑張るにゃ！',
    condition: { minDaysAbsent: 7 },
  },
]

/**
 * 初回訪問
 */
const firstVisit: DialogueEntry[] = [
  {
    id: 'first_visit_1',
    message: '駒猫へようこそにゃ！一緒に将棋を楽しむにゃ〜',
  },
  {
    id: 'first_visit_2',
    message: 'はじめましてにゃ！将棋、教えてあげるにゃ〜',
  },
]

/**
 * 詰将棋開始時
 */
const tsumeshogiStart: DialogueEntry[] = [
  {
    id: 'tsume_start_1',
    message: '王手の連続で玉を詰ませるにゃ！',
  },
  {
    id: 'tsume_start_2',
    message: '持ち駒を上手く使ってにゃ〜',
  },
  {
    id: 'tsume_start_3',
    message: '詰み筋が見えるかにゃ？頑張るにゃ！',
  },
  {
    id: 'tsume_start_4',
    message: '落ち着いて考えるにゃ〜',
  },
]

/**
 * 詰将棋正解時
 */
const tsumeshogiCorrect: DialogueEntry[] = [
  {
    id: 'tsume_correct_1',
    message: '正解にゃ！さすがにゃ〜',
  },
  {
    id: 'tsume_correct_2',
    message: 'バッチリにゃ！',
  },
  {
    id: 'tsume_correct_3',
    message: 'すごいにゃ！よく見えたにゃ〜',
  },
  {
    id: 'tsume_correct_4',
    message: 'お見事にゃ！',
  },
  {
    id: 'tsume_correct_5',
    message: 'その調子にゃ〜！',
  },
  // 高正解率時のセリフ
  {
    id: 'tsume_correct_accuracy_high',
    message: '絶好調にゃ！冴えてるにゃ〜',
    condition: { minAccuracy: 80 },
  },
]

/**
 * 詰将棋不正解時
 */
const tsumeshogiWrong: DialogueEntry[] = [
  {
    id: 'tsume_wrong_1',
    message: '惜しいにゃ...もう一回考えてみるにゃ',
  },
  {
    id: 'tsume_wrong_2',
    message: 'ちょっと違うにゃ...でも諦めないにゃ！',
  },
  {
    id: 'tsume_wrong_3',
    message: '難しいにゃね...ヒントを使ってもいいにゃよ',
  },
  {
    id: 'tsume_wrong_4',
    message: '間違えても大丈夫にゃ、それが学びにゃ〜',
  },
  {
    id: 'tsume_wrong_5',
    message: 'もう少しにゃ！王様の逃げ道を塞ぐにゃ',
  },
]

/**
 * 詰将棋ヒント時
 */
const tsumeshogiHint: DialogueEntry[] = [
  {
    id: 'tsume_hint_1',
    message: 'ヒントにゃ！よく見て考えるにゃ〜',
  },
  {
    id: 'tsume_hint_2',
    message: 'ここがポイントにゃ！',
  },
]

/**
 * レッスン開始時
 */
const lessonStart: DialogueEntry[] = [
  {
    id: 'lesson_start_1',
    message: 'レッスン開始にゃ！一緒に頑張るにゃ〜',
  },
  {
    id: 'lesson_start_2',
    message: '新しいことを学ぶにゃ！ワクワクするにゃ〜',
  },
  {
    id: 'lesson_start_3',
    message: '準備はいいにゃ？始めるにゃ〜',
  },
]

/**
 * レッスン正解時
 */
const lessonCorrect: DialogueEntry[] = [
  {
    id: 'lesson_correct_1',
    message: '正解にゃ！よく分かったにゃ〜',
  },
  {
    id: 'lesson_correct_2',
    message: 'その通りにゃ！',
  },
  {
    id: 'lesson_correct_3',
    message: 'バッチリにゃ！覚えが早いにゃ〜',
  },
]

/**
 * レッスン不正解時
 */
const lessonWrong: DialogueEntry[] = [
  {
    id: 'lesson_wrong_1',
    message: '惜しいにゃ...もう一度やってみるにゃ',
  },
  {
    id: 'lesson_wrong_2',
    message: 'ちょっと違うにゃ...大丈夫、覚えられるにゃ！',
  },
  {
    id: 'lesson_wrong_3',
    message: '間違いは学びのチャンスにゃ〜',
  },
]

/**
 * レッスン中の相手の番
 */
const lessonOpponent: DialogueEntry[] = [
  {
    id: 'lesson_opponent_1',
    message: '相手の番にゃ...',
  },
  {
    id: 'lesson_opponent_2',
    message: '相手が考え中にゃ...',
  },
  {
    id: 'lesson_opponent_3',
    message: '次は相手の手にゃ...',
  },
]

/**
 * レッスン完了時（正解率別）
 */
const lessonComplete: DialogueEntry[] = [
  {
    id: 'lesson_complete_perfect',
    message: 'パーフェクトにゃ！すごいにゃ〜〜！',
    condition: { minAccuracy: 100 },
  },
  {
    id: 'lesson_complete_great',
    message: 'よくできたにゃ！その調子にゃ〜',
    condition: { minAccuracy: 80, maxAccuracy: 99 },
  },
  {
    id: 'lesson_complete_good',
    message: 'まあまあにゃ！復習すればもっと良くなるにゃ',
    condition: { minAccuracy: 60, maxAccuracy: 79 },
  },
  {
    id: 'lesson_complete_retry',
    message: '復習するにゃ！何度もやれば覚えるにゃ〜',
    condition: { maxAccuracy: 59 },
  },
]

/**
 * ストリーク継続
 */
const streakContinue: DialogueEntry[] = [
  {
    id: 'streak_continue_1',
    message: '今日も頑張ったにゃ！えらいにゃ〜',
  },
  {
    id: 'streak_continue_2',
    message: '継続は力にゃ！その調子にゃ〜',
  },
]

/**
 * ストリークマイルストーン
 */
const streakMilestone: DialogueEntry[] = [
  {
    id: 'streak_milestone_3',
    message: '3日連続にゃ！いい調子にゃ〜',
    condition: { minStreakDays: 3, maxStreakDays: 3 },
  },
  {
    id: 'streak_milestone_7',
    message: 'パーフェクトウィーク達成にゃ！すごいにゃ〜！',
    condition: { minStreakDays: 7, maxStreakDays: 7 },
  },
  {
    id: 'streak_milestone_14',
    message: '2週間連続にゃ！本当にすごいにゃ〜',
    condition: { minStreakDays: 14, maxStreakDays: 14 },
  },
  {
    id: 'streak_milestone_30',
    message: '30日達成にゃ〜〜！尊敬するにゃ！',
    condition: { minStreakDays: 30, maxStreakDays: 30 },
  },
]

/**
 * ハート残り少ない時
 */
const lowHearts: DialogueEntry[] = [
  {
    id: 'low_hearts_1',
    message: 'ハートが少なくなってきたにゃ...少し休憩するにゃ？',
  },
  {
    id: 'low_hearts_2',
    message: '休憩も大事にゃ〜ハートが回復したらまた来てにゃ',
  },
]

/**
 * カテゴリ別セリフマップ
 */
export const dialogueMap: Record<DialogueCategory, DialogueEntry[]> = {
  home_greeting: homeGreeting,
  comeback: comeback,
  first_visit: firstVisit,
  tsumeshogi_start: tsumeshogiStart,
  tsumeshogi_correct: tsumeshogiCorrect,
  tsumeshogi_wrong: tsumeshogiWrong,
  tsumeshogi_hint: tsumeshogiHint,
  lesson_start: lessonStart,
  lesson_correct: lessonCorrect,
  lesson_wrong: lessonWrong,
  lesson_complete: lessonComplete,
  lesson_opponent: lessonOpponent,
  streak_continue: streakContinue,
  streak_milestone: streakMilestone,
  low_hearts: lowHearts,
}

/**
 * カテゴリのセリフ一覧を取得
 */
export function getDialoguesForCategory(
  category: DialogueCategory
): DialogueEntry[] {
  return dialogueMap[category] || []
}
