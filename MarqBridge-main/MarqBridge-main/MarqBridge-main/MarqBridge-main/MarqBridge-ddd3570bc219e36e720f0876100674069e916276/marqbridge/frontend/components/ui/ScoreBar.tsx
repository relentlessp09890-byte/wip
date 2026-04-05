interface ScoreBarProps {
  value: number
  label: string
}

export function ScoreBar({ value, label }: ScoreBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
