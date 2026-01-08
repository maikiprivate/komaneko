/**
 * ステータスバッジコンポーネント
 */

export type Status = 'published' | 'draft' | 'archived'

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    archived: 'bg-slate-50 text-slate-500 border-slate-200',
  }
  const labels = {
    published: '公開中',
    draft: '下書き',
    archived: 'アーカイブ',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'published'
            ? 'bg-emerald-500'
            : status === 'draft'
              ? 'bg-amber-500'
              : 'bg-slate-400'
        }`}
      />
      {labels[status]}
    </span>
  )
}
