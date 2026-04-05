import { ScoreBar } from '@/components/ui/ScoreBar'

export function RiskStatusPanel() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Risk status</p>
          <h2 className="text-xl font-semibold">System health</h2>
        </div>
        <span className="rounded-full bg-amber-600/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-300">
          Warning
        </span>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-400">Portfolio heat</p>
          <ScoreBar value={72} label="Overall risk" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/80 p-4">
            <p className="text-xs uppercase text-slate-500">Margin usage</p>
            <p className="mt-2 text-3xl font-semibold text-white">62%</p>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-4">
            <p className="text-xs uppercase text-slate-500">Liquidation proximity</p>
            <p className="mt-2 text-3xl font-semibold text-white">14%</p>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-4">
            <p className="text-xs uppercase text-slate-500">Market regime</p>
            <p className="mt-2 text-3xl font-semibold text-white">VOLATILE</p>
          </div>
        </div>
      </div>
    </section>
  )
}
