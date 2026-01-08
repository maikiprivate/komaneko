/**
 * 手順ツリーパネルコンポーネント
 */

import { useState } from 'react'
import {
  type EditorMoveNode,
  getBranchInfoAtPath,
  sfenMoveToJapanese,
} from '../../lib/lesson/moveTreeUtils'
import type { BranchPath, MoveTree } from '../../lib/lesson/types'
import type { Player } from '../../lib/shogi/types'

interface MoveTreePanelProps {
  nodes: EditorMoveNode[]
  currentTurn: Player
  selectedNodeIndex: number
  onNodeClick: (index: number) => void
  onClear: () => void
  /** 分岐情報取得用のツリー */
  fullMoveTree: MoveTree | null
  /** 現在のパス */
  currentPath: BranchPath[]
  /** 分岐切り替え時のコールバック */
  onBranchSwitch?: (nodeIndex: number, newBranchIndex: number) => void
}

export function MoveTreePanel({
  nodes,
  currentTurn,
  selectedNodeIndex,
  onNodeClick,
  onClear,
  fullMoveTree,
  currentPath,
  onBranchSwitch,
}: MoveTreePanelProps) {
  // 分岐ポップオーバーの状態
  const [popoverNodeIndex, setPopoverNodeIndex] = useState<number | null>(null)

  // ノードごとの分岐情報を取得
  const getBranchCount = (nodeIndex: number): number => {
    if (!fullMoveTree) return 0
    const branchInfo = getBranchInfoAtPath(fullMoveTree, currentPath, nodeIndex)
    return branchInfo ? branchInfo.siblings.length : 0
  }

  // 分岐バッジをクリック
  const handleBadgeClick = (e: React.MouseEvent, nodeIndex: number) => {
    e.stopPropagation()
    setPopoverNodeIndex(popoverNodeIndex === nodeIndex ? null : nodeIndex)
  }

  // 分岐を選択
  const handleBranchSelect = (nodeIndex: number, branchIndex: number) => {
    onBranchSwitch?.(nodeIndex, branchIndex)
    setPopoverNodeIndex(null)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="font-medium text-slate-700">手順ツリー</h2>
        <span className="text-xs text-slate-400">
          {currentTurn === 'sente' ? '先手番' : '後手番'}
        </span>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {nodes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            手順設定モードで
            <br />
            盤面をクリックして手を追加
          </div>
        ) : (
          <div className="space-y-1">
            {/* 初期局面 */}
            <button
              onClick={() => onNodeClick(-1)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left transition-colors ${
                selectedNodeIndex === -1
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-slate-400 w-5">0.</span>
              <span className="text-slate-600">初期局面</span>
            </button>
            {nodes.map((node, index) => {
              const branchCount = getBranchCount(index)
              const branchInfo = fullMoveTree
                ? getBranchInfoAtPath(fullMoveTree, currentPath, index)
                : null

              return (
                <div key={node.id} className="relative">
                  <button
                    onClick={() => onNodeClick(index)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left transition-colors ${
                      selectedNodeIndex === index
                        ? 'ring-2 ring-primary ' +
                          (node.isPlayerMove ? 'bg-blue-100' : 'bg-orange-100')
                        : node.isPlayerMove
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'bg-orange-50 hover:bg-orange-100'
                    }`}
                  >
                    <span className="text-slate-400 w-5">{index + 1}.</span>
                    <span
                      className={`flex-1 ${node.isPlayerMove ? 'text-blue-700' : 'text-orange-700'}`}
                    >
                      {node.isPlayerMove ? '▲' : '△'} {sfenMoveToJapanese(node.move)}
                    </span>
                    {/* 分岐バッジ */}
                    {branchCount > 1 && (
                      <button
                        onClick={(e) => handleBadgeClick(e, index)}
                        className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center hover:bg-primary-dark"
                        title={`${branchCount}つの分岐`}
                      >
                        {branchCount}
                      </button>
                    )}
                  </button>

                  {/* 分岐選択ポップオーバー */}
                  {popoverNodeIndex === index && branchInfo && branchInfo.siblings.length > 1 && (
                    <div className="absolute right-0 top-full mt-1 z-10 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
                      {branchInfo.siblings.map((sibling, i) => (
                        <button
                          key={sibling.id}
                          onClick={() => handleBranchSelect(index, i)}
                          className={`w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-slate-50 ${
                            i === branchInfo.currentIndex ? 'bg-primary/10' : ''
                          }`}
                        >
                          <span
                            className={sibling.isPlayerMove ? 'text-blue-700' : 'text-orange-700'}
                          >
                            {sibling.isPlayerMove ? '▲' : '△'} {sfenMoveToJapanese(sibling.move)}
                          </span>
                          {i === branchInfo.currentIndex && (
                            <svg
                              className="w-4 h-4 text-primary ml-auto"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 flex justify-between">
        <button
          className="flex items-center gap-2 text-xs text-primary hover:text-primary-dark transition-colors"
          title="現在位置に別の手を追加"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          分岐を追加
        </button>
        {nodes.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-red-600 transition-colors"
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}
