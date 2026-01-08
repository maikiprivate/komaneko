/**
 * 視点変換ロジック
 * 後手視点の場合、盤面を180度回転させる
 */

import type { Board, CapturedPieces, Perspective } from './types'

/**
 * 盤面を指定した視点に変換
 * - sente: そのまま（一段目が上、9筋が左）
 * - gote: 180度回転（九段目が上、1筋が左）
 */
export function transformBoardForPerspective(board: Board, perspective: Perspective): Board {
  if (perspective === 'sente') {
    return board
  }

  // 後手視点: 行と列を逆順にする
  return board
    .slice()
    .reverse()
    .map((row) => row.slice().reverse())
}

/**
 * 符号ラベルを指定した視点に変換
 */
export function getFileLabels(perspective: Perspective): string[] {
  const labels = ['9', '8', '7', '6', '5', '4', '3', '2', '1']
  return perspective === 'sente' ? labels : labels.slice().reverse()
}

export function getRankLabels(perspective: Perspective): string[] {
  const labels = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
  return perspective === 'sente' ? labels : labels.slice().reverse()
}

/**
 * 駒台の並び順を取得
 * - sente視点: 先手の駒台が下、後手の駒台が上
 * - gote視点: 後手の駒台が下、先手の駒台が上
 */
export interface PieceStandOrder {
  top: {
    pieces: CapturedPieces
    label: string
    isOpponent: boolean
  }
  bottom: {
    pieces: CapturedPieces
    label: string
    isOpponent: boolean
  }
}

export function getPieceStandOrder(
  sentePieces: CapturedPieces,
  gotePieces: CapturedPieces,
  perspective: Perspective,
): PieceStandOrder {
  if (perspective === 'sente') {
    return {
      top: { pieces: gotePieces, label: '後手', isOpponent: true },
      bottom: { pieces: sentePieces, label: '先手', isOpponent: false },
    }
  }
  return {
    top: { pieces: sentePieces, label: '先手', isOpponent: true },
    bottom: { pieces: gotePieces, label: '後手', isOpponent: false },
  }
}
