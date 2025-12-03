/**
 * 詰将棋モックデータ
 */

/** 問題のステータス */
export type ProblemStatus = 'unsolved' | 'in_progress' | 'solved'

/** ヒント用の手情報 */
export interface HintMove {
  /** 移動の場合: 移動元 */
  from?: { row: number; col: number }
  /** 移動先 */
  to: { row: number; col: number }
  /** 打ち駒の場合: 駒種 */
  piece?: string
}

/** 解答再生用の手情報 */
export interface SolutionMove {
  /** 移動の場合: 移動元 */
  from?: { row: number; col: number }
  /** 移動先 */
  to: { row: number; col: number }
  /** 打ち駒の場合: 駒種 */
  piece?: string
  /** 成りフラグ */
  promote?: boolean
}

/** 詰将棋問題 */
export interface TsumeshogiProblem {
  id: string
  sfen: string
  moves: number  // 手数（3, 5, 7）
  status: ProblemStatus
  /** ヒント（初手） */
  hint?: HintMove
  /** 解答（棋譜表記の配列） */
  solution?: string[]
  /** 解答（再生用の手データ） */
  solutionMoves?: SolutionMove[]
}

/** 手数のオプション */
export const MOVES_OPTIONS = [3, 5, 7] as const
export type MovesOption = (typeof MOVES_OPTIONS)[number]

/** 手数の表示名 */
export const MOVES_LABELS: Record<MovesOption, string> = {
  3: '3手詰め',
  5: '5手詰め',
  7: '7手詰め',
}

/** 初期配置SFEN（テスト用） */
export const INITIAL_POSITION_SFEN = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1'

/** モックデータ */
export const MOCK_TSUMESHOGI_PROBLEMS: TsumeshogiProblem[] = [
  // テスト用: 初期配置
  {
    id: 'test-initial',
    sfen: INITIAL_POSITION_SFEN,
    moves: 3,
    status: 'unsolved',
  },
  // 3手詰め
  {
    id: '3-001',
    sfen: '7nl/7k1/6ppp/9/9/9/9/9/9 b GS 1',
    moves: 3,
    status: 'solved',
    hint: { piece: 'kin', to: { row: 0, col: 6 } },  // ▲3一金
    solution: ['▲3一金', '△同玉', '▲2二銀'],
    solutionMoves: [
      { piece: 'kin', to: { row: 0, col: 6 } },        // ▲3一金
      { from: { row: 1, col: 7 }, to: { row: 0, col: 6 } },  // △同玉
      { piece: 'gin', to: { row: 1, col: 7 } },        // ▲2二銀
    ],
  },
  {
    id: '3-002',
    sfen: '8l/7k1/7pp/9/9/9/9/9/9 b RG 1',
    moves: 3,
    status: 'solved',
    hint: { piece: 'hi', to: { row: 0, col: 7 } },  // ▲2一飛（打ち駒）
    solution: ['▲2一飛', '△1二玉', '▲1一金'],
  },
  {
    id: '3-003',
    sfen: 'l5+R1l/4kS3/p4pnpp/2Pppb3/6p1P/P2s5/NP2+nPPR1/2+bS2GK1/L6NL b 3GSP4p 93',
    moves: 3,
    status: 'in_progress',
    hint: { from: { row: 0, col: 6 }, to: { row: 1, col: 6 } },  // ▲3二龍（盤上の駒）
    solution: ['▲3二龍', '△同銀', '▲5二金'],
  },
  {
    id: '3-004',
    sfen: '8k/7G1/9/9/9/9/9/9/9 b R 1',
    moves: 3,
    status: 'unsolved',
    hint: { piece: 'hi', to: { row: 0, col: 7 } },  // ▲2一飛（打ち駒）
    solution: ['▲2一飛', '△同金', '▲同飛成'],
  },
  {
    id: '3-005',
    sfen: 'k8/1G7/9/9/9/9/9/9/9 b R 1',
    moves: 3,
    status: 'unsolved',
  },
  // 5手詰め
  {
    id: '5-001',
    sfen: '7nl/6Gbk/6ppp/9/9/9/9/9/9 b RS 1',
    moves: 5,
    status: 'solved',
  },
  {
    id: '5-002',
    sfen: '8l/7sk/6ppp/9/9/9/9/9/9 b RBG 1',
    moves: 5,
    status: 'unsolved',
  },
  {
    id: '5-003',
    sfen: '7nl/6skp/6p1p/9/9/9/9/9/9 b RBG 1',
    moves: 5,
    status: 'unsolved',
  },
  {
    id: '5-004',
    sfen: '6snl/5g1k1/5pppp/9/9/9/9/9/9 b RB2S 1',
    moves: 5,
    status: 'unsolved',
  },
  // 7手詰め
  {
    id: '7-001',
    sfen: '7nl/6skp/6p1p/9/9/9/9/9/9 b RB2G 1',
    moves: 7,
    status: 'unsolved',
  },
  {
    id: '7-002',
    sfen: '6snl/5g1k1/5pppp/9/9/9/9/9/9 b RB2S 1',
    moves: 7,
    status: 'unsolved',
  },
  {
    id: '7-003',
    sfen: '6snl/5gsk1/5pppp/9/9/9/9/9/9 b RB2G 1',
    moves: 7,
    status: 'unsolved',
  },
]

/** 手数でフィルタリング */
export function filterByMoves(problems: TsumeshogiProblem[], moves: MovesOption): TsumeshogiProblem[] {
  return problems.filter((p) => p.moves === moves)
}

/** 次の問題を取得（挑戦中 > 未解答の順） */
export function getNextProblem(problems: TsumeshogiProblem[], moves: MovesOption): TsumeshogiProblem | null {
  const filtered = filterByMoves(problems, moves)

  // 挑戦中があればそれを返す
  const inProgress = filtered.find((p) => p.status === 'in_progress')
  if (inProgress) return inProgress

  // なければ未解答の最初を返す
  const unsolved = filtered.find((p) => p.status === 'unsolved')
  return unsolved ?? null
}
