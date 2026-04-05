interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

const badgeStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-800 text-slate-200',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  danger: 'bg-rose-500/15 text-rose-300',
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[variant]}`}>{label}</span>
}
