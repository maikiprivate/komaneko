/**
 * ホーム画面用モックデータ
 *
 * 参考: Duolingo, ソーシャルゲームの体力システム
 */

export const mockHomeData = {
  user: {
    name: null, // 匿名ユーザー
  },

  // 体力（ハート）システム
  hearts: {
    current: 7, // 現在のハート数
    max: 10, // 最大ハート数
    // 回復情報（1ハート = 30分で回復と仮定）
    recovery: {
      nextRecoveryMinutes: 18, // 次の1ハート回復まで18分
      fullRecoveryMinutes: 108, // 全回復まで108分（18 + 30 * 3）
    },
  },

  // 連続学習（ストリーク）システム
  streak: {
    current: 3, // 現在の連続日数
    longest: 7, // 最長記録
    // 今週の学習状況（月〜日、0=月曜）
    weeklyProgress: [
      { completed: true, date: 24 },
      { completed: true, date: 25 },
      { completed: true, date: 26 },
      { completed: false, date: 27 }, // 今日
      { completed: false, date: 28 },
      { completed: false, date: 29 },
      { completed: false, date: 30 },
    ],
    todayIndex: 3, // 今日は木曜日（0=月曜）
  },

  // 今日の進捗
  todayProgress: {
    lessonsCompleted: 0, // 今日完了したレッスン数
    goal: 1, // 今日の目標（1レッスンでストリーク維持）
  },
}

export const learningMenus = [
  {
    id: 'lesson',
    title: '駒塾',
    description: '駒の動かし方を学ぼう',
    icon: 'graduation-cap',
    route: '/lesson',
  },
  {
    id: 'tsumeshogi',
    title: '詰将棋',
    description: '詰みを見つけよう',
    icon: 'puzzle-piece',
    route: '/tsumeshogi',
  },
] as const

export type HomeData = typeof mockHomeData
export type LearningMenu = (typeof learningMenus)[number]
