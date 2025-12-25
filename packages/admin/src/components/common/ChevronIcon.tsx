/**
 * 展開/折りたたみアイコンコンポーネント
 */

interface ChevronIconProps {
  expanded: boolean
}

export function ChevronIcon({ expanded }: ChevronIconProps) {
  return (
    <div className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
      expanded ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
    }`}>
      <svg
        className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}
