/**
 * 成り確認ダイアログコンポーネント
 */

import type { PieceType } from '../../lib/shogi/types'

interface PromotionDialogProps {
  pieceType: PieceType
  onChoice: (promote: boolean) => void
}

export function PromotionDialog({ pieceType, onChoice }: PromotionDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full mx-4">
        <div className="flex justify-center mb-3">
          <img src={`/pieces/${pieceType}.png`} alt={pieceType} className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-4 text-center">成りますか？</h3>
        <div className="flex gap-3">
          <button
            onClick={() => onChoice(true)}
            className="flex-1 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            成る
          </button>
          <button
            onClick={() => onChoice(false)}
            className="flex-1 py-3 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            不成
          </button>
        </div>
      </div>
    </div>
  )
}
