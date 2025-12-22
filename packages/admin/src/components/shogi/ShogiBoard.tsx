/**
 * 将棋盤コンポーネント（Web版）
 */

import type { Board, Perspective, Position } from '../../lib/shogi/types'
import {
  transformBoardForPerspective,
  getFileLabels,
  getRankLabels,
} from '../../lib/shogi/perspective'
import { Piece } from './Piece'

/** 将棋盤の木目色 */
const BOARD_COLORS = {
  background: '#E8C98E',
  border: '#CD853F',
  cellBorder: '#A0826D',
  star: '#5D4037',
  label: '#8B7355',
  selected: '#FFD54F',
  possible: '#A5D6A7',
  lastMoveFrom: '#FFE4B5',
  lastMoveTo: '#FFDAB9',
  hint: '#FF9800',
} as const

/** 最後に指された手（ハイライト用） */
interface LastMoveHighlight {
  from?: Position
  to: Position
}

/** ヒントのハイライト情報 */
interface HintHighlight {
  from?: Position
  to: Position
}

interface ShogiBoardProps {
  board: Board
  perspective: Perspective
  cellSize?: number
  /** セルタップ時のコールバック（row, colは元の盤面座標） */
  onCellClick?: (row: number, col: number) => void
  /** 選択中のマス（元の盤面座標） */
  selectedPosition?: Position | null
  /** 移動可能なマス一覧（元の盤面座標） */
  possibleMoves?: Position[]
  /** 最後に指された手（ハイライト用） */
  lastMove?: LastMoveHighlight | null
  /** ヒントのハイライト */
  hintHighlight?: HintHighlight | null
}

// 星の位置（罫線の交点）
const STAR_POSITIONS_SENTE = [
  { row: 2, col: 2 },
  { row: 2, col: 5 },
  { row: 5, col: 2 },
  { row: 5, col: 5 },
]

const STAR_POSITIONS_GOTE = [
  { row: 3, col: 3 },
  { row: 3, col: 6 },
  { row: 6, col: 3 },
  { row: 6, col: 6 },
]

function hasStarAtBottomRight(row: number, col: number, perspective: Perspective): boolean {
  const positions = perspective === 'sente' ? STAR_POSITIONS_SENTE : STAR_POSITIONS_GOTE
  return positions.some((pos) => pos.row === row && pos.col === col)
}

export function ShogiBoard({
  board,
  perspective,
  cellSize = 40,
  onCellClick,
  selectedPosition,
  possibleMoves = [],
  lastMove,
  hintHighlight,
}: ShogiBoardProps) {
  const labelSize = 16
  const transformedBoard = transformBoardForPerspective(board, perspective)
  const fileLabels = getFileLabels(perspective)
  const rankLabels = getRankLabels(perspective)

  // 表示座標から元の盤面座標に変換
  const toOriginalCoord = (displayRow: number, displayCol: number): { row: number; col: number } => {
    if (perspective === 'gote') {
      return { row: 8 - displayRow, col: 8 - displayCol }
    }
    return { row: displayRow, col: displayCol }
  }

  // 元の盤面座標が選択中かどうか
  const isSelected = (displayRow: number, displayCol: number): boolean => {
    if (!selectedPosition) return false
    const orig = toOriginalCoord(displayRow, displayCol)
    return orig.row === selectedPosition.row && orig.col === selectedPosition.col
  }

  // 元の盤面座標が移動可能かどうか
  const isPossibleMove = (displayRow: number, displayCol: number): boolean => {
    const orig = toOriginalCoord(displayRow, displayCol)
    return possibleMoves.some((p) => p.row === orig.row && p.col === orig.col)
  }

  // 最後に指された手のハイライト
  const isLastMoveFrom = (displayRow: number, displayCol: number): boolean => {
    if (!lastMove?.from) return false
    const orig = toOriginalCoord(displayRow, displayCol)
    return orig.row === lastMove.from.row && orig.col === lastMove.from.col
  }

  const isLastMoveTo = (displayRow: number, displayCol: number): boolean => {
    if (!lastMove) return false
    const orig = toOriginalCoord(displayRow, displayCol)
    return orig.row === lastMove.to.row && orig.col === lastMove.to.col
  }

  // ヒントのハイライト
  const isHint = (displayRow: number, displayCol: number): boolean => {
    if (!hintHighlight?.from) return false
    const orig = toOriginalCoord(displayRow, displayCol)
    return orig.row === hintHighlight.from.row && orig.col === hintHighlight.from.col
  }

  const handleCellClick = (displayRow: number, displayCol: number) => {
    if (!onCellClick) return
    const orig = toOriginalCoord(displayRow, displayCol)
    onCellClick(orig.row, orig.col)
  }

  const getCellBackground = (rowIndex: number, colIndex: number): string | undefined => {
    if (isSelected(rowIndex, colIndex)) return BOARD_COLORS.selected
    if (isPossibleMove(rowIndex, colIndex)) return BOARD_COLORS.possible
    if (isHint(rowIndex, colIndex)) return BOARD_COLORS.hint
    if (isLastMoveTo(rowIndex, colIndex)) return BOARD_COLORS.lastMoveTo
    if (isLastMoveFrom(rowIndex, colIndex)) return BOARD_COLORS.lastMoveFrom
    return undefined
  }

  return (
    <div
      style={{
        backgroundColor: BOARD_COLORS.background,
        padding: 4,
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: BOARD_COLORS.border,
        borderRadius: 4,
        display: 'inline-block',
      }}
    >
      {/* 筋の番号（上部） */}
      <div style={{ display: 'flex', marginLeft: 0 }}>
        {fileLabels.map((label, index) => (
          <div
            key={index}
            style={{
              width: cellSize,
              height: labelSize,
              fontSize: 12,
              color: BOARD_COLORS.label,
              textAlign: 'center',
              lineHeight: `${labelSize}px`,
            }}
          >
            {label}
          </div>
        ))}
        <div style={{ width: labelSize }} />
      </div>

      {/* 盤面 + 段の番号 */}
      {transformedBoard.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex' }}>
          {row.map((piece, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              style={{
                width: cellSize,
                height: cellSize,
                borderWidth: 0.5,
                borderStyle: 'solid',
                borderColor: BOARD_COLORS.cellBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: onCellClick ? 'pointer' : 'default',
                position: 'relative',
                backgroundColor: getCellBackground(rowIndex, colIndex),
              }}
            >
              {piece && (
                <Piece
                  type={piece.type}
                  isOpponent={piece.owner !== perspective}
                  size={cellSize - 4}
                />
              )}
              {hasStarAtBottomRight(rowIndex, colIndex, perspective) && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: BOARD_COLORS.star,
                    zIndex: 10,
                  }}
                />
              )}
            </div>
          ))}
          {/* 段の番号（右側） */}
          <div
            style={{
              width: labelSize,
              height: cellSize,
              fontSize: 12,
              color: BOARD_COLORS.label,
              textAlign: 'center',
              lineHeight: `${cellSize}px`,
              paddingLeft: 4,
            }}
          >
            {rankLabels[rowIndex]}
          </div>
        </div>
      ))}
    </div>
  )
}
