/**
 * 駒台コンポーネント（Web版）
 */

import type { CapturedPieces, PieceType } from '../../lib/shogi/types'
import { HAND_PIECE_TYPES } from '../../lib/shogi/types'
import { Piece } from './Piece'

/** 駒台の色 */
const STAND_COLORS = {
  background: '#D6B891',
  border: '#B8956E',
  label: '#6D4C41',
  count: '#5D4037',
  countBg: '#FFF8E1',
  selected: '#FFD54F',
  hint: '#FF9800',
} as const

interface PieceStandProps {
  pieces: CapturedPieces
  isOpponent?: boolean
  pieceSize?: number
  label?: string
  width?: number
  /** 持ち駒クリック時のコールバック */
  onPieceClick?: (pieceType: PieceType) => void
  /** 駒台の空きエリアクリック時のコールバック（エディタ用） */
  onStandClick?: () => void
  /** 選択中の駒 */
  selectedPiece?: PieceType | null
  /** ヒント表示中の駒 */
  hintPiece?: PieceType | null
}

export function PieceStand({
  pieces,
  isOpponent = false,
  pieceSize = 32,
  label,
  width,
  onPieceClick,
  onStandClick,
  selectedPiece,
  hintPiece,
}: PieceStandProps) {
  // 相手は右から左へ、自分は左から右へ
  const piecesDirection = isOpponent ? 'row-reverse' : 'row'
  // 相手はラベル左、自分はラベル右
  const containerDirection = isOpponent ? 'row' : 'row-reverse'

  // タップ可能かどうか（相手の駒台はタップ不可）
  const isClickable = !isOpponent && !!onPieceClick
  // 駒台全体がクリック可能か（エディタ用）
  const isStandClickable = !!onStandClick

  // 駒台の高さ（駒の有無に関わらず一定）
  const standHeight = pieceSize + 14

  return (
    <div
      onClick={isStandClickable ? onStandClick : undefined}
      style={{
        display: 'flex',
        flexDirection: containerDirection,
        alignItems: 'center',
        backgroundColor: STAND_COLORS.background,
        borderRadius: 4,
        border: `1px solid ${STAND_COLORS.border}`,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
        height: standHeight,
        width: width,
        boxSizing: 'border-box',
        cursor: isStandClickable ? 'pointer' : 'default',
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: STAND_COLORS.label,
            marginLeft: 8,
            marginRight: 8,
          }}
        >
          {label}
        </span>
      )}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: piecesDirection,
          alignItems: 'center',
          gap: 4,
        }}
      >
        {HAND_PIECE_TYPES.map((pieceType) => {
          const count = pieces[pieceType] ?? 0
          if (count === 0) return null

          const isSelected = selectedPiece === pieceType
          const isHint = hintPiece === pieceType

          let bgColor: string | undefined
          if (isSelected) bgColor = STAND_COLORS.selected
          else if (isHint) bgColor = STAND_COLORS.hint

          return (
            <div
              key={pieceType}
              onClick={(e) => {
                e.stopPropagation()
                if (isClickable) onPieceClick(pieceType)
              }}
              style={{
                position: 'relative',
                borderRadius: 4,
                padding: 2,
                cursor: isClickable ? 'pointer' : 'default',
                backgroundColor: bgColor,
              }}
            >
              <Piece type={pieceType} isOpponent={isOpponent} size={pieceSize} />
              {count > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -6,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: STAND_COLORS.count,
                    backgroundColor: STAND_COLORS.countBg,
                    borderRadius: 6,
                    minWidth: 14,
                    textAlign: 'center',
                    lineHeight: '14px',
                  }}
                >
                  {count}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
