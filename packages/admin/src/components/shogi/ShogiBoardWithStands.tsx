/**
 * 将棋盤 + 駒台のセットコンポーネント
 */

import { getPieceStandOrder } from '../../lib/shogi/perspective'
import type { BoardState, Perspective, PieceType, Position } from '../../lib/shogi/types'
import { PieceStand } from './PieceStand'
import { ShogiBoard } from './ShogiBoard'

interface ShogiBoardWithStandsProps {
  boardState: BoardState
  perspective?: Perspective
  cellSize?: number
  /** 盤面セルクリック時 */
  onCellClick?: (row: number, col: number) => void
  /** 持ち駒クリック時（下側の駒台のみ、後方互換用） */
  onHandPieceClick?: (pieceType: PieceType) => void
  /** 先手持ち駒クリック時 */
  onSenteHandPieceClick?: (pieceType: PieceType) => void
  /** 後手持ち駒クリック時 */
  onGoteHandPieceClick?: (pieceType: PieceType) => void
  /** 先手駒台クリック時（エディタ用） */
  onSenteStandClick?: () => void
  /** 後手駒台クリック時（エディタ用） */
  onGoteStandClick?: () => void
  /** 選択中のマス */
  selectedPosition?: Position | null
  /** 選択中の持ち駒（先手） */
  selectedHandPiece?: PieceType | null
  /** 選択中の持ち駒（後手） */
  selectedGoteHandPiece?: PieceType | null
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
  onSenteHandPieceClick,
  onGoteHandPieceClick,
  onSenteStandClick,
  onGoteStandClick,
  selectedPosition,
  selectedHandPiece,
  selectedGoteHandPiece,
  possibleMoves = [],
  lastMove,
  hintHighlight,
  hintHandPiece,
}: ShogiBoardWithStandsProps) {
  const { top, bottom } = getPieceStandOrder(
    boardState.capturedPieces.sente,
    boardState.capturedPieces.gote,
    perspective,
  )

  // 盤面の幅を計算（セル9個 + 段ラベル）
  const boardWidth = cellSize * 9 + 16 + 8

  // 視点に応じて駒台のクリックハンドラを決定
  const topStandClick = perspective === 'sente' ? onGoteStandClick : onSenteStandClick
  const bottomStandClick = perspective === 'sente' ? onSenteStandClick : onGoteStandClick

  // 視点に応じて持ち駒クリックハンドラを決定
  const topPieceClick = perspective === 'sente' ? onGoteHandPieceClick : onSenteHandPieceClick
  const bottomPieceClick =
    perspective === 'sente'
      ? (onSenteHandPieceClick ?? onHandPieceClick)
      : (onGoteHandPieceClick ?? onHandPieceClick)

  // 視点に応じて選択状態を決定
  const topSelectedPiece = perspective === 'sente' ? selectedGoteHandPiece : selectedHandPiece
  const bottomSelectedPiece = perspective === 'sente' ? selectedHandPiece : selectedGoteHandPiece

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* 上側の駒台（相手） */}
      <PieceStand
        pieces={top.pieces}
        isOpponent={top.isOpponent}
        pieceSize={cellSize - 8}
        label={top.label}
        width={boardWidth}
        onPieceClick={topPieceClick}
        onStandClick={topStandClick}
        selectedPiece={topSelectedPiece}
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
        onPieceClick={bottomPieceClick}
        onStandClick={bottomStandClick}
        selectedPiece={bottomSelectedPiece}
        hintPiece={hintHandPiece}
      />
    </div>
  )
}
