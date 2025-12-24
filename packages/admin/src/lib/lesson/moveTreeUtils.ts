/**
 * 手順ツリーのユーティリティ関数
 */

import type { MoveNode, MoveTree, SfenMove, EditorProblem } from './types'
import type { Position, BoardState } from '../shogi/types'

/**
 * エディタ用のノード（盤面状態を含む）
 */
export interface EditorMoveNode extends MoveNode {
  /** この手を指した後の盤面状態 */
  boardState: BoardState
}

/**
 * ユニークIDを生成
 *
 * crypto.randomUUID() を使用して衝突リスクを排除
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * 空の手順ツリーを作成
 */
export function createEmptyMoveTree(sfen: string): MoveTree {
  return {
    rootSfen: sfen,
    branches: [],
  }
}

/**
 * 新しいMoveNodeを作成
 */
export function createMoveNode(
  move: SfenMove,
  isPlayerMove: boolean
): MoveNode {
  return {
    id: generateId(),
    move,
    isPlayerMove,
    children: [],
  }
}

/**
 * Position を SFEN形式の手に変換
 * 例: { row: 6, col: 6 } -> { row: 5, col: 6 } => "7g7f"
 */
export function positionToSfenMove(
  from: Position,
  to: Position,
  promote: boolean = false
): SfenMove {
  const files = '987654321'
  const ranks = 'abcdefghi'

  const fromFile = files[from.col]
  const fromRank = ranks[from.row]
  const toFile = files[to.col]
  const toRank = ranks[to.row]

  return `${fromFile}${fromRank}${toFile}${toRank}${promote ? '+' : ''}`
}

/**
 * 駒打ちを SFEN形式の手に変換
 * 例: 金を5五に打つ => "G*5e"
 */
export function dropToSfenMove(pieceType: string, to: Position): SfenMove {
  const files = '987654321'
  const ranks = 'abcdefghi'
  const pieceChar = pieceTypeToSfenChar(pieceType)

  return `${pieceChar}*${files[to.col]}${ranks[to.row]}`
}

/**
 * 駒種をSFEN文字に変換
 */
function pieceTypeToSfenChar(pieceType: string): string {
  const map: Record<string, string> = {
    fu: 'P',
    kyo: 'L',
    kei: 'N',
    gin: 'S',
    kin: 'G',
    kaku: 'B',
    hi: 'R',
    ou: 'K',
  }
  return map[pieceType] || 'P'
}

/**
 * SFEN形式の手を日本語表記に変換
 * 例: "7g7f" => "７六歩"（駒名は別途必要）
 */
export function sfenMoveToJapanese(move: SfenMove): string {
  // 駒打ちの場合
  if (move.includes('*')) {
    const [piece, pos] = move.split('*')
    const file = pos[0]
    const rank = pos[1]
    const japaneseRank = rankToJapanese(rank)
    return `${file}${japaneseRank}${pieceToJapanese(piece)}打`
  }

  // 通常の移動
  const toFile = move[2]
  const toRank = move[3]
  const promote = move[4] === '+'

  const japaneseToRank = rankToJapanese(toRank)
  const suffix = promote ? '成' : ''

  return `${toFile}${japaneseToRank}${suffix}`
}

function rankToJapanese(rank: string): string {
  const map: Record<string, string> = {
    a: '一',
    b: '二',
    c: '三',
    d: '四',
    e: '五',
    f: '六',
    g: '七',
    h: '八',
    i: '九',
  }
  return map[rank] || rank
}

function pieceToJapanese(piece: string): string {
  const map: Record<string, string> = {
    P: '歩',
    L: '香',
    N: '桂',
    S: '銀',
    G: '金',
    B: '角',
    R: '飛',
    K: '玉',
  }
  return map[piece.toUpperCase()] || piece
}

/**
 * 手順ツリーを全パス（シーケンス配列）に変換
 * API保存用
 */
export function serializeMoveTree(tree: MoveTree): SfenMove[][] {
  const result: SfenMove[][] = []

  function traverse(node: MoveNode, path: SfenMove[]) {
    const currentPath = [...path, node.move]

    if (node.children.length === 0) {
      // 葉ノード = 完結したシーケンス
      result.push(currentPath)
    } else {
      for (const child of node.children) {
        traverse(child, currentPath)
      }
    }
  }

  for (const branch of tree.branches) {
    traverse(branch, [])
  }

  return result
}

/**
 * シーケンス配列を手順ツリーに変換
 * API読み込み用
 */
export function deserializeMoveTree(
  sequences: SfenMove[][],
  rootSfen: string
): MoveTree {
  const tree: MoveTree = {
    rootSfen,
    branches: [],
  }

  for (const sequence of sequences) {
    let currentLevel = tree.branches

    for (let i = 0; i < sequence.length; i++) {
      const move = sequence[i]
      const isPlayerMove = i % 2 === 0

      // 既存ノードを探す
      let node = currentLevel.find((n) => n.move === move)

      if (!node) {
        node = createMoveNode(move, isPlayerMove)
        currentLevel.push(node)
      }

      currentLevel = node.children
    }
  }

  return tree
}

/**
 * ツリーのノード数をカウント
 */
export function countMoveNodes(tree: MoveTree): number {
  let count = 0

  function traverse(node: MoveNode) {
    count++
    for (const child of node.children) {
      traverse(child)
    }
  }

  for (const branch of tree.branches) {
    traverse(branch)
  }

  return count
}

/**
 * ツリーが空かどうか
 */
export function isTreeEmpty(tree: MoveTree): boolean {
  return tree.branches.length === 0
}

/**
 * 新しいEditorProblemを作成
 */
export function createNewProblem(order: number): EditorProblem {
  const emptySfen = '9/9/9/9/9/9/9/9/9 b - 1'
  return {
    id: generateId(),
    order,
    sfen: emptySfen,
    instruction: '',
    moveTree: createEmptyMoveTree(emptySfen),
  }
}

// =============================================================================
// EditorMoveNode[] <-> MoveTree 変換
// =============================================================================

/**
 * EditorMoveNode[] を MoveTree に変換
 *
 * 現在は分岐なしの線形配列のみ対応
 * 将来的に分岐対応時は拡張が必要
 */
export function editorNodesToMoveTree(
  nodes: EditorMoveNode[],
  rootSfen: string
): MoveTree {
  if (nodes.length === 0) {
    return createEmptyMoveTree(rootSfen)
  }

  // 線形配列をツリー構造に変換（最後のノードから逆順に構築）
  let currentNode: MoveNode | null = null

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    const newNode: MoveNode = {
      id: node.id,
      move: node.move,
      isPlayerMove: node.isPlayerMove,
      children: currentNode ? [currentNode] : [],
    }
    currentNode = newNode
  }

  return {
    rootSfen,
    branches: currentNode ? [currentNode] : [],
  }
}

/**
 * MoveTree を EditorMoveNode[] に変換
 *
 * ツリーの最初の分岐のみを線形配列として取得
 * 複数分岐がある場合は最初の分岐のみ使用
 *
 * @param tree 変換元のMoveTree
 * @param replayMoves 盤面状態を再現するための関数
 * @returns EditorMoveNode[] の配列
 */
export function moveTreeToEditorNodes(
  tree: MoveTree,
  replayMoves: (rootSfen: string, moves: MoveNode[]) => EditorMoveNode[]
): EditorMoveNode[] {
  if (tree.branches.length === 0) {
    return []
  }

  // 最初の分岐を線形リストとして取得
  const linearNodes: MoveNode[] = []
  let current: MoveNode | undefined = tree.branches[0]

  while (current) {
    linearNodes.push(current)
    // 最初の子のみをたどる（分岐は無視）
    current = current.children[0]
  }

  // replayMoves で盤面状態を再現
  return replayMoves(tree.rootSfen, linearNodes)
}
