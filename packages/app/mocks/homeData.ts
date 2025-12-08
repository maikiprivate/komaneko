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
    current: 1, // 現在の連続日数
    longest: 7, // 最長記録
    // 今週の学習状況（月〜日、0=月曜）
    weeklyProgress: [
      { completed: false, date: 2 }, // 今日（月曜）- アニメーションで完了になる
      { completed: false, date: 3 },
      { completed: false, date: 4 },
      { completed: false, date: 5 },
      { completed: false, date: 6 },
      { completed: false, date: 7 },
      { completed: false, date: 8 },
    ],
    todayIndex: 0, // 今日は月曜日（0=月曜）
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
