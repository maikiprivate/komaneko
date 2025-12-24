/**
 * 将棋盤 + 駒台のセットコンポーネント
 */

import type { BoardState, Perspective, Position, PieceType } from '../../lib/shogi/types'
import { getPieceStandOrder } from '../../lib/shogi/perspective'
import { ShogiBoard } from './ShogiBoard'
import { PieceStand } from './PieceStand'

interface ShogiBoardWithStandsProps {
  boardState: BoardState
  perspective?: Perspective
  cellSize?: number
  /** 盤面セルクリック時 */
  onCellClick?: (row: number, col: number) => void
  /** 持ち駒クリック時 */
  onHandPieceClick?: (pieceType: PieceType) => void
  /** 先手駒台クリック時（エディタ用） */
  onSenteStandClick?: () => void
  /** 後手駒台クリック時（エディタ用） */
  onGoteStandClick?: () => void
  /** 選択中のマス */
  selectedPosition?: Position | null
  /** 選択中の持ち駒 */
  selectedHandPiece?: PieceType | null
  /** 移動可能なマス一覧 */
  possibleMoves?: Position[]
  /** 最後に指された手 */
  lastMove?: { from?: Position; to: Position } | null
  /** ヒントハイライト */
  hintHighlight?: { from?: Position; to: Position } | null
  /** ヒント持ち駒 */
  hintHandPiece?: PieceType | null
}

export function ShogiBoardWithStands({
  boardState,
  perspective = 'sente',
  cellSize = 40,
  onCellClick,
  onHandPieceClick,
  onSenteStandClick,
  onGoteStandClick,
  selectedPosition,
  selectedHandPiece,
  possibleMoves = [],
  lastMove,
  hintHighlight,
  hintHandPiece,
}: ShogiBoardWithStandsProps) {
  const { top, bottom } = getPieceStandOrder(
    boardState.capturedPieces.sente,
    boardState.capturedPieces.gote,
    perspective
  )

  // 盤面の幅を計算（セル9個 + 段ラベル）
  const boardWidth = cellSize * 9 + 16 + 8

  // 視点に応じて駒台のクリックハンドラを決定
  const topStandClick = perspective === 'sente' ? onGoteStandClick : onSenteStandClick
  const bottomStandClick = perspective === 'sente' ? onSenteStandClick : onGoteStandClick

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* 上側の駒台（相手） */}
      <PieceStand
        pieces={top.pieces}
        isOpponent={top.isOpponent}
        pieceSize={cellSize - 8}
        label={top.label}
        width={boardWidth}
        onStandClick={topStandClick}
      />

      {/* 将棋盤 */}
      <ShogiBoard
        board={boardState.board}
        perspective={perspective}
        cellSize={cellSize}
        onCellClick={onCellClick}
        selectedPosition={selectedPosition}
        possibleMoves={possibleMoves}
        lastMove={lastMove}
        hintHighlight={hintHighlight}
      />

      {/* 下側の駒台（自分） */}
      <PieceStand
        pieces={bottom.pieces}
        isOpponent={bottom.isOpponent}
        pieceSize={cellSize - 8}
        label={bottom.label}
        width={boardWidth}
        onPieceClick={onHandPieceClick}
        onStandClick={bottomStandClick}
        selectedPiece={selectedHandPiece}
        hintPiece={hintHandPiece}
      />
    </div>
  )
}
