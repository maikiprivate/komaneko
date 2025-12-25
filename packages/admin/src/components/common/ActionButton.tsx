/**
 * アクションボタンコンポーネント
 */

interface ActionButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
}

export function ActionButton({
  children,
  variant = 'secondary',
  onClick,
  disabled,
}: ActionButtonProps) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    danger: 'bg-white text-red-600 border border-slate-200 hover:bg-red-50 hover:border-red-200',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${styles[variant]} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}
