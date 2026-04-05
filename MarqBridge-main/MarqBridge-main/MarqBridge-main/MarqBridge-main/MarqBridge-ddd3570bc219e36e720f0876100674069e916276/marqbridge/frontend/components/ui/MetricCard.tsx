interface MetricCardProps {
  title: string
  value: string
  label: string
}

export function MetricCard({ title, value, label }: MetricCardProps) {
  return (
    <div className="rounded-3xl bg-slate-900/80 p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  )
}
