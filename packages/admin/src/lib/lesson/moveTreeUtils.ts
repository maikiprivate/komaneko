/**
 * 手順ツリーのユーティリティ関数
 */

import type { MoveNode, MoveTree, SfenMove, EditorProblem, BranchPath, BranchInfo } from './types'
import type { Position, BoardState, PieceType } from '../shogi/types'
import { parseSfen, EMPTY_BOARD_SFEN } from '../shogi/sfen'
import { makeMove, makeDrop } from '../shogi/moveGenerator'

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
  return {
    id: generateId(),
    order,
    sfen: EMPTY_BOARD_SFEN,
    instruction: '',
    moveTree: createEmptyMoveTree(EMPTY_BOARD_SFEN),
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

// =============================================================================
// 分岐操作用のユーティリティ関数
// =============================================================================

/**
 * パスに沿ってノードを取得
 *
 * @param tree ツリー
 * @param path パス（BranchPath配列）
 * @returns パス上の全ノード（初期局面は含まない）
 */
export function getNodesAlongPath(tree: MoveTree, path: BranchPath[]): MoveNode[] {
  if (path.length === 0 || tree.branches.length === 0) {
    return []
  }

  const result: MoveNode[] = []
  let currentLevel = tree.branches

  for (const step of path) {
    const node = currentLevel.find((n) => n.id === step.nodeId)
    if (!node) {
      // パスが無効な場合は途中まで返す
      break
    }
    result.push(node)
    currentLevel = node.children
  }

  return result
}

/**
 * パスの最後のノードを取得
 *
 * @param tree ツリー
 * @param path パス
 * @returns パスの最後のノード、または undefined
 */
export function getNodeAtPath(tree: MoveTree, path: BranchPath[]): MoveNode | undefined {
  const nodes = getNodesAlongPath(tree, path)
  return nodes.length > 0 ? nodes[nodes.length - 1] : undefined
}

/**
 * 既存の子ノードを検索
 *
 * 同じ手が既に子にあれば返す
 */
export function findExistingChild(node: MoveNode, move: SfenMove): MoveNode | undefined {
  return node.children.find((child) => child.move === move)
}

/**
 * ルートレベルで既存の手を検索
 */
export function findExistingBranch(tree: MoveTree, move: SfenMove): MoveNode | undefined {
  return tree.branches.find((branch) => branch.move === move)
}

/**
 * パスの位置に新しい手を追加
 *
 * 同じ手が既にある場合はその分岐を選択し、新しいパスを返す。
 * 新しい手の場合は新規分岐を作成し、新しいパスを返す。
 *
 * @param tree ツリー（イミュータブル、変更しない）
 * @param path 現在のパス
 * @param move 追加する手
 * @param isPlayerMove プレイヤーの手かどうか
 * @returns { tree: 新しいツリー, path: 新しいパス }
 */
export function addMoveAtPath(
  tree: MoveTree,
  path: BranchPath[],
  move: SfenMove,
  isPlayerMove: boolean
): { tree: MoveTree; path: BranchPath[] } {
  // 深いコピーを作成（イミュータブル操作のため）
  // structuredCloneはJSON.parse/stringifyより効率的で、undefinedも正しく扱える
  // コピー後のツリーに対してgetNodesAlongPathでパス上のノードを取得すると、
  // IDで検索するため同一ノードへの参照を正しく取得できる
  const newTree: MoveTree = structuredClone(tree)

  if (path.length === 0) {
    // ルートレベルに追加
    const existing = findExistingBranch(newTree, move)
    if (existing) {
      // 既存の分岐を選択
      const branchIndex = newTree.branches.findIndex((b) => b.id === existing.id)
      return {
        tree: newTree,
        path: [{ nodeId: existing.id, branchIndex }],
      }
    } else {
      // 新規分岐を作成
      const newNode = createMoveNode(move, isPlayerMove)
      newTree.branches.push(newNode)
      return {
        tree: newTree,
        path: [{ nodeId: newNode.id, branchIndex: newTree.branches.length - 1 }],
      }
    }
  }

  // パスの最後のノードを探して子に追加
  const nodes = getNodesAlongPath(newTree, path)
  const lastNode = nodes[nodes.length - 1]

  if (!lastNode) {
    // パスが無効な場合はルートに追加
    return addMoveAtPath(tree, [], move, isPlayerMove)
  }

  const existingChild = findExistingChild(lastNode, move)
  if (existingChild) {
    // 既存の子を選択
    const branchIndex = lastNode.children.findIndex((c) => c.id === existingChild.id)
    return {
      tree: newTree,
      path: [...path, { nodeId: existingChild.id, branchIndex }],
    }
  } else {
    // 新規子ノードを作成
    const newNode = createMoveNode(move, isPlayerMove)
    lastNode.children.push(newNode)
    return {
      tree: newTree,
      path: [...path, { nodeId: newNode.id, branchIndex: lastNode.children.length - 1 }],
    }
  }
}

/**
 * パスの位置の分岐を削除
 *
 * @param tree ツリー
 * @param path 削除するノードへのパス
 * @returns 新しいツリー
 */
export function deleteBranchAtPath(tree: MoveTree, path: BranchPath[]): MoveTree {
  if (path.length === 0) {
    return tree
  }

  const newTree: MoveTree = structuredClone(tree)

  if (path.length === 1) {
    // ルートレベルの分岐を削除
    const nodeId = path[0].nodeId
    newTree.branches = newTree.branches.filter((b) => b.id !== nodeId)
    return newTree
  }

  // 親ノードを探して子から削除
  const parentPath = path.slice(0, -1)
  const parentNodes = getNodesAlongPath(newTree, parentPath)
  const parentNode = parentNodes[parentNodes.length - 1]

  if (parentNode) {
    const nodeId = path[path.length - 1].nodeId
    parentNode.children = parentNode.children.filter((c) => c.id !== nodeId)
  }

  return newTree
}

/**
 * 特定のノードの分岐情報を取得
 *
 * @param tree ツリー
 * @param path パス（対象ノードを含む）
 * @param nodeIndex パス内のインデックス（0=最初のノード）
 * @returns 分岐情報、またはnull
 */
export function getBranchInfoAtPath(
  tree: MoveTree,
  path: BranchPath[],
  nodeIndex: number
): BranchInfo | null {
  if (nodeIndex < 0 || nodeIndex >= path.length) {
    return null
  }

  const step = path[nodeIndex]

  if (nodeIndex === 0) {
    // ルートレベル
    // 削除によりインデックスがずれる可能性があるため、常にIDから現在位置を再計算
    const currentIndex = tree.branches.findIndex((b) => b.id === step.nodeId)
    if (currentIndex === -1) {
      return null
    }
    return {
      currentNodeId: step.nodeId,
      siblings: tree.branches,
      currentIndex,
    }
  }

  // 親ノードの子を取得
  const parentPath = path.slice(0, nodeIndex)
  const parentNode = getNodeAtPath(tree, parentPath)

  if (!parentNode) {
    return null
  }

  // 削除によりインデックスがずれる可能性があるため、常にIDから現在位置を再計算
  const currentIndex = parentNode.children.findIndex((c) => c.id === step.nodeId)
  if (currentIndex === -1) {
    return null
  }

  return {
    currentNodeId: step.nodeId,
    siblings: parentNode.children,
    currentIndex,
  }
}

/**
 * パス上の特定のノードを別の分岐に切り替え
 *
 * @param tree ツリー
 * @param path 現在のパス
 * @param nodeIndex 切り替えるノードのインデックス
 * @param newBranchIndex 新しい分岐インデックス
 * @returns 新しいパス（切り替えたノード以降は新しい分岐の最初の子をたどる）
 */
export function switchBranchAtPath(
  tree: MoveTree,
  path: BranchPath[],
  nodeIndex: number,
  newBranchIndex: number
): BranchPath[] {
  const branchInfo = getBranchInfoAtPath(tree, path, nodeIndex)
  if (!branchInfo || newBranchIndex >= branchInfo.siblings.length) {
    return path
  }

  const newNode = branchInfo.siblings[newBranchIndex]
  const newPath = path.slice(0, nodeIndex)
  newPath.push({ nodeId: newNode.id, branchIndex: newBranchIndex })

  // 新しい分岐の最初の子をたどってパスを完成させる
  let current = newNode
  while (current.children.length > 0) {
    const firstChild = current.children[0]
    newPath.push({ nodeId: firstChild.id, branchIndex: 0 })
    current = firstChild
  }

  return newPath
}

/**
 * パスを特定のインデックスまで切り詰める
 *
 * ノードをクリックしたときに、そのノードまでのパスを返す
 */
export function truncatePathToIndex(path: BranchPath[], index: number): BranchPath[] {
  if (index < 0 || index >= path.length) {
    return path
  }
  return path.slice(0, index + 1)
}

/**
 * MoveTreeからパス表現を生成（最初の分岐のみ）
 *
 * ツリー読み込み時に初期パスを生成するのに使用
 */
export function createDefaultPath(tree: MoveTree): BranchPath[] {
  const path: BranchPath[] = []

  if (tree.branches.length === 0) {
    return path
  }

  // 最初の分岐をたどる
  let current = tree.branches[0]
  path.push({ nodeId: current.id, branchIndex: 0 })

  while (current.children.length > 0) {
    current = current.children[0]
    path.push({ nodeId: current.id, branchIndex: 0 })
  }

  return path
}

// =============================================================================
// SFEN手の適用・再生用ユーティリティ
// =============================================================================

/**
 * SFEN位置文字列をPosition に変換
 * @example sfenPosToPosition('7', 'g') => { row: 6, col: 2 }
 */
export function sfenPosToPosition(file: string, rank: string): Position {
  const files = '987654321'
  const ranks = 'abcdefghi'
  return {
    row: ranks.indexOf(rank),
    col: files.indexOf(file),
  }
}

/**
 * SFEN駒文字をPieceTypeに変換
 */
export function sfenCharToPieceType(char: string): PieceType {
  const map: Record<string, PieceType> = {
    P: 'fu', L: 'kyo', N: 'kei', S: 'gin',
    G: 'kin', B: 'kaku', R: 'hi', K: 'ou',
  }
  return map[char.toUpperCase()] || 'fu'
}

/**
 * SFEN形式の手を盤面に適用
 *
 * @param boardState 現在の盤面状態
 * @param sfenMove SFEN形式の手 (例: "7g7f", "P*5e")
 * @returns 新しい盤面状態、または失敗時はnull
 */
export function applyMoveFromSfen(boardState: BoardState, sfenMove: string): BoardState | null {
  // 駒打ちの場合: "P*5e" 形式
  if (sfenMove.includes('*')) {
    const pieceChar = sfenMove[0]
    const toFile = sfenMove[2]
    const toRank = sfenMove[3]

    const pieceType = sfenCharToPieceType(pieceChar)
    const to = sfenPosToPosition(toFile, toRank)
    const owner = boardState.turn

    return makeDrop(boardState, pieceType, to, owner)
  }

  // 通常の移動: "7g7f" または "7g7f+" 形式
  const fromFile = sfenMove[0]
  const fromRank = sfenMove[1]
  const toFile = sfenMove[2]
  const toRank = sfenMove[3]
  const promote = sfenMove[4] === '+'

  const from = sfenPosToPosition(fromFile, fromRank)
  const to = sfenPosToPosition(toFile, toRank)

  return makeMove(boardState, from, to, promote)
}

/**
 * パスに沿ってMoveTreeを再生してEditorMoveNode[]を作成
 *
 * @param tree MoveTree
 * @param path 現在のパス
 * @returns EditorMoveNode[] パス上のノード（盤面状態付き）
 */
export function replayMoveTreeWithPath(tree: MoveTree, path: BranchPath[]): EditorMoveNode[] {
  if (path.length === 0 || tree.branches.length === 0) {
    return []
  }

  const nodes = getNodesAlongPath(tree, path)
  const result: EditorMoveNode[] = []
  let currentBoardState = parseSfen(tree.rootSfen)

  for (const node of nodes) {
    const newBoardState = applyMoveFromSfen(currentBoardState, node.move)
    if (newBoardState) {
      result.push({
        id: node.id,
        move: node.move,
        isPlayerMove: node.isPlayerMove,
        children: node.children,
        boardState: newBoardState,
      })
      currentBoardState = newBoardState
    }
  }

  return result
}
