/**
 * 駒塾（レッスン）型定義
 *
 * Note: モックデータは削除済み。APIから取得したデータを使用する。
 */

import type { PieceType, Position } from '@/lib/shogi/types'

// =============================================================================
// 型定義
// =============================================================================

/** レッスンのステータス */
export type LessonStatus = 'locked' | 'available' | 'completed'

/**
 * シーケンス内の1手
 * - 移動: type='move', from/to/promote
 * - 駒打ち: type='drop', to/piece
 *
 * Note: lib/shogi/types.ts の Move 型（MoveAction | DropAction）と類似しているが、
 * 以下の理由で別の型を定義している:
 * - Move型は owner フィールドを含むが、レッスンのシーケンスでは
 *   偶数インデックス=自分、奇数インデックス=相手 で決定されるため不要
 * - シンプルな構造にすることでAPIレスポンス（moveTree）からの変換を容易にする
 * - 将来的に統一する場合は、共通の基底型を定義することを検討
 */
export interface SequenceMove {
  type: 'move' | 'drop'
  from?: Position
  to: Position
  promote?: boolean
  piece?: PieceType
}

/**
 * 問題（複数手順対応）
 *
 * correctSequences: 複数の正解バリエーション
 * 各バリエーションは手順配列 [自分の手, 相手の手, 自分の手, ...]
 *
 * 例: [["5e5d", "5c5d", "G*5c"]] - 1パターンの3手シーケンス
 * 例: [["5e5d"], ["6e6d"]] - 2つの正解パターン（各1手）
 */
export interface SequenceProblem {
  id: string
  sfen: string
  instruction: string
  correctSequences: SequenceMove[][]
  /** 解説文（正解後に表示、空文字の場合は表示しない） */
  explanation: string
}

/** レッスン */
export interface SequenceLesson {
  id: string
  title: string
  status: LessonStatus
  problems: SequenceProblem[]
}
