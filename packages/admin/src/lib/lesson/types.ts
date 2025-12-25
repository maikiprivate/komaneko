/**
 * レッスン問題編集用の型定義
 */

import type { Position } from '../shogi/types'

/** SFEN形式の手（例: "7g7f", "2h3h+"） */
export type SfenMove = string

/**
 * 手順ツリーのノード
 *
 * 各ノードは1つの手を表し、children で続きの手（分岐）を持つ
 */
export interface MoveNode {
  /** ユニークID（React key用） */
  id: string
  /** SFEN形式の手 */
  move: SfenMove
  /** true=プレイヤー, false=相手 */
  isPlayerMove: boolean
  /** 続きの手（分岐可能） */
  children: MoveNode[]
}

/**
 * 問題の手順ツリー
 *
 * branches が最初の手（複数=複数正解）
 */
export interface MoveTree {
  /** 初期局面のSFEN */
  rootSfen: string
  /** 最初の手（複数=複数正解） */
  branches: MoveNode[]
}

/**
 * 正解の手（従来形式、データ互換用）
 */
export interface CorrectMove {
  from: Position
  to: Position
  promote?: boolean
}

/**
 * エディタ用の問題データ
 */
export interface EditorProblem {
  id: string
  order: number
  /** 初期局面のSFEN */
  sfen: string
  /** 指示文 */
  instruction: string
  /** 手順ツリー */
  moveTree: MoveTree
}

/**
 * エディタのモード
 */
export type EditorMode = 'setup' | 'moves'

/**
 * 初期配置モードの状態
 */
export type SetupState =
  | { type: 'idle' }
  | { type: 'piece_selected'; pieceType: string; owner: 'sente' | 'gote' }

/**
 * 手順設定モードの状態
 */
export type MovesState =
  | { type: 'idle' }
  | { type: 'piece_selected'; position: Position; validMoves: Position[] }
  | { type: 'awaiting_promotion'; from: Position; to: Position }

// =============================================================================
// 分岐機能用の型定義
// =============================================================================

/**
 * 分岐パス
 *
 * ツリー内の現在位置を表す。各要素はそのノードとその親からの分岐インデックス。
 */
export interface BranchPath {
  /** このノードのID */
  nodeId: string
  /** 何番目の分岐か (0=メインライン, 1=第2分岐, ...) */
  branchIndex: number
}

/**
 * 分岐情報
 *
 * 特定のノードの兄弟分岐に関する情報
 */
export interface BranchInfo {
  /** 現在のノードID */
  currentNodeId: string
  /** 兄弟ノード一覧（現在のノードを含む） */
  siblings: MoveNode[]
  /** 現在のノードが何番目か */
  currentIndex: number
}
