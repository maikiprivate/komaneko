/**
 * moveTreeUtils.ts のユニットテスト
 */

import { describe, expect, it } from 'vitest'
import {
  addMoveAtPath,
  countMoveNodes,
  createDefaultPath,
  createEmptyMoveTree,
  createMoveNode,
  deleteBranchAtPath,
  deserializeMoveTree,
  dropToSfenMove,
  getNodesAlongPath,
  isTreeEmpty,
  positionToSfenMove,
  serializeMoveTree,
  sfenMoveToJapanese,
} from './moveTreeUtils'
import type { BranchPath, MoveTree } from './types'

describe('createEmptyMoveTree', () => {
  it('空の手順ツリーを作成', () => {
    const sfen = '9/9/9/9/9/9/9/9/9 b - 1'
    const tree = createEmptyMoveTree(sfen)

    expect(tree.rootSfen).toBe(sfen)
    expect(tree.branches).toEqual([])
  })
})

describe('serializeMoveTree / deserializeMoveTree', () => {
  it('空のツリーはシリアライズすると空配列', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    const serialized = serializeMoveTree(tree)

    expect(serialized).toEqual([])
  })

  it('単一パスの往復変換', () => {
    const rootSfen = '9/9/9/9/9/9/9/9/9 b - 1'
    const original: MoveTree = {
      rootSfen,
      branches: [
        {
          id: '1',
          move: '7g7f',
          isPlayerMove: true,
          children: [
            {
              id: '2',
              move: '3c3d',
              isPlayerMove: false,
              children: [
                {
                  id: '3',
                  move: '2g2f',
                  isPlayerMove: true,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    }

    const serialized = serializeMoveTree(original)
    expect(serialized).toEqual([['7g7f', '3c3d', '2g2f']])

    const deserialized = deserializeMoveTree(serialized, rootSfen)
    expect(deserialized.rootSfen).toBe(rootSfen)
    expect(deserialized.branches.length).toBe(1)
    expect(deserialized.branches[0].move).toBe('7g7f')
    expect(deserialized.branches[0].children[0].move).toBe('3c3d')
    expect(deserialized.branches[0].children[0].children[0].move).toBe('2g2f')
  })

  it('分岐のある往復変換', () => {
    const rootSfen = '9/9/9/9/9/9/9/9/9 b - 1'
    const sequences = [
      ['7g7f', '3c3d', '2g2f'],
      ['7g7f', '8c8d', '2g2f'], // 2手目で分岐
    ]

    const tree = deserializeMoveTree(sequences, rootSfen)

    // 分岐構造を確認
    expect(tree.branches.length).toBe(1)
    expect(tree.branches[0].move).toBe('7g7f')
    expect(tree.branches[0].children.length).toBe(2) // 分岐
    expect(tree.branches[0].children[0].move).toBe('3c3d')
    expect(tree.branches[0].children[1].move).toBe('8c8d')

    // 再シリアライズ
    const reSerialized = serializeMoveTree(tree)
    expect(reSerialized.length).toBe(2)
    expect(reSerialized).toContainEqual(['7g7f', '3c3d', '2g2f'])
    expect(reSerialized).toContainEqual(['7g7f', '8c8d', '2g2f'])
  })

  it('複数の初手分岐の往復変換', () => {
    const rootSfen = '9/9/9/9/9/9/9/9/9 b - 1'
    const sequences = [
      ['7g7f', '3c3d'],
      ['2g2f', '8c8d'],
    ]

    const tree = deserializeMoveTree(sequences, rootSfen)

    expect(tree.branches.length).toBe(2)
    expect(tree.branches[0].move).toBe('7g7f')
    expect(tree.branches[1].move).toBe('2g2f')

    const reSerialized = serializeMoveTree(tree)
    expect(reSerialized.length).toBe(2)
  })
})

describe('positionToSfenMove', () => {
  it('通常の移動（成りなし）', () => {
    // 7七 -> 7六 (歩を進める)
    expect(positionToSfenMove({ row: 6, col: 2 }, { row: 5, col: 2 })).toBe('7g7f')
  })

  it('成りあり', () => {
    // 3三 -> 2二 成り
    expect(positionToSfenMove({ row: 2, col: 6 }, { row: 1, col: 7 }, true)).toBe('3c2b+')
  })

  it('角の移動', () => {
    // 8八 -> 2二
    expect(positionToSfenMove({ row: 7, col: 1 }, { row: 1, col: 7 })).toBe('8h2b')
  })
})

describe('dropToSfenMove', () => {
  it('歩打ち', () => {
    // 5五に歩を打つ
    expect(dropToSfenMove('fu', { row: 4, col: 4 })).toBe('P*5e')
  })

  it('金打ち', () => {
    // 5二に金を打つ
    expect(dropToSfenMove('kin', { row: 1, col: 4 })).toBe('G*5b')
  })

  it('飛車打ち', () => {
    // 1九に飛車を打つ
    expect(dropToSfenMove('hi', { row: 8, col: 8 })).toBe('R*1i')
  })
})

describe('sfenMoveToJapanese', () => {
  it('通常の移動', () => {
    expect(sfenMoveToJapanese('7g7f')).toBe('7六')
  })

  it('成りの表記', () => {
    expect(sfenMoveToJapanese('3c2b+')).toBe('2二成')
  })

  it('駒打ち', () => {
    expect(sfenMoveToJapanese('P*5e')).toBe('5五歩打')
    expect(sfenMoveToJapanese('G*3c')).toBe('3三金打')
  })
})

describe('addMoveAtPath', () => {
  it('空のツリーに手を追加', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    const result = addMoveAtPath(tree, [], '7g7f', true)

    expect(result.tree.branches.length).toBe(1)
    expect(result.tree.branches[0].move).toBe('7g7f')
    expect(result.path.length).toBe(1)
    expect(result.path[0].branchIndex).toBe(0)
  })

  it('既存の手と同じ手を追加すると既存を選択', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    const first = addMoveAtPath(tree, [], '7g7f', true)
    const second = addMoveAtPath(first.tree, [], '7g7f', true)

    // 新しいノードは追加されず、既存のパスが返る
    expect(second.tree.branches.length).toBe(1)
    expect(second.path[0].nodeId).toBe(first.path[0].nodeId)
  })

  it('子ノードに手を追加', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    const first = addMoveAtPath(tree, [], '7g7f', true)
    const second = addMoveAtPath(first.tree, first.path, '3c3d', false)

    expect(second.tree.branches[0].children.length).toBe(1)
    expect(second.tree.branches[0].children[0].move).toBe('3c3d')
    expect(second.path.length).toBe(2)
  })

  it('分岐を作成', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    const first = addMoveAtPath(tree, [], '7g7f', true)
    const second = addMoveAtPath(first.tree, first.path, '3c3d', false)
    // 同じ位置から別の手を指す（分岐作成）
    const branch = addMoveAtPath(second.tree, first.path, '8c8d', false)

    expect(branch.tree.branches[0].children.length).toBe(2)
    expect(branch.tree.branches[0].children[0].move).toBe('3c3d')
    expect(branch.tree.branches[0].children[1].move).toBe('8c8d')
  })
})

describe('countMoveNodes', () => {
  it('空のツリーは0', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    expect(countMoveNodes(tree)).toBe(0)
  })

  it('単一パスのカウント', () => {
    const tree: MoveTree = {
      rootSfen: '9/9/9/9/9/9/9/9/9 b - 1',
      branches: [
        {
          id: '1',
          move: '7g7f',
          isPlayerMove: true,
          children: [
            {
              id: '2',
              move: '3c3d',
              isPlayerMove: false,
              children: [],
            },
          ],
        },
      ],
    }
    expect(countMoveNodes(tree)).toBe(2)
  })
})

describe('isTreeEmpty', () => {
  it('空のツリーはtrue', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    expect(isTreeEmpty(tree)).toBe(true)
  })

  it('手があるツリーはfalse', () => {
    const tree: MoveTree = {
      rootSfen: '9/9/9/9/9/9/9/9/9 b - 1',
      branches: [
        {
          id: '1',
          move: '7g7f',
          isPlayerMove: true,
          children: [],
        },
      ],
    }
    expect(isTreeEmpty(tree)).toBe(false)
  })
})

describe('createDefaultPath', () => {
  it('空のツリーは空のパス', () => {
    const tree = createEmptyMoveTree('9/9/9/9/9/9/9/9/9 b - 1')
    expect(createDefaultPath(tree)).toEqual([])
  })

  it('単一パスを返す', () => {
    const tree: MoveTree = {
      rootSfen: '9/9/9/9/9/9/9/9/9 b - 1',
      branches: [
        {
          id: 'node1',
          move: '7g7f',
          isPlayerMove: true,
          children: [
            {
              id: 'node2',
              move: '3c3d',
              isPlayerMove: false,
              children: [],
            },
          ],
        },
      ],
    }
    const path = createDefaultPath(tree)

    expect(path.length).toBe(2)
    expect(path[0].nodeId).toBe('node1')
    expect(path[1].nodeId).toBe('node2')
  })
})

describe('getNodesAlongPath', () => {
  it('パスに沿ったノードを取得', () => {
    const tree: MoveTree = {
      rootSfen: '9/9/9/9/9/9/9/9/9 b - 1',
      branches: [
        {
          id: 'node1',
          move: '7g7f',
          isPlayerMove: true,
          children: [
            {
              id: 'node2',
              move: '3c3d',
              isPlayerMove: false,
              children: [],
            },
          ],
        },
      ],
    }
    const path: BranchPath[] = [
      { nodeId: 'node1', branchIndex: 0 },
      { nodeId: 'node2', branchIndex: 0 },
    ]

    const nodes = getNodesAlongPath(tree, path)
    expect(nodes.length).toBe(2)
    expect(nodes[0].move).toBe('7g7f')
    expect(nodes[1].move).toBe('3c3d')
  })
})

describe('deleteBranchAtPath', () => {
  it('ルートレベルの分岐を削除', () => {
    const tree: MoveTree = {
      rootSfen: '9/9/9/9/9/9/9/9/9 b - 1',
      branches: [
        { id: 'node1', move: '7g7f', isPlayerMove: true, children: [] },
        { id: 'node2', move: '2g2f', isPlayerMove: true, children: [] },
      ],
    }
    const path: BranchPath[] = [{ nodeId: 'node1', branchIndex: 0 }]

    const newTree = deleteBranchAtPath(tree, path)
    expect(newTree.branches.length).toBe(1)
    expect(newTree.branches[0].id).toBe('node2')
  })

  it('子ノードを削除', () => {
    const tree: MoveTree = {
      rootSfen: '9/9/9/9/9/9/9/9/9 b - 1',
      branches: [
        {
          id: 'node1',
          move: '7g7f',
          isPlayerMove: true,
          children: [
            { id: 'child1', move: '3c3d', isPlayerMove: false, children: [] },
            { id: 'child2', move: '8c8d', isPlayerMove: false, children: [] },
          ],
        },
      ],
    }
    const path: BranchPath[] = [
      { nodeId: 'node1', branchIndex: 0 },
      { nodeId: 'child1', branchIndex: 0 },
    ]

    const newTree = deleteBranchAtPath(tree, path)
    expect(newTree.branches[0].children.length).toBe(1)
    expect(newTree.branches[0].children[0].id).toBe('child2')
  })
})
