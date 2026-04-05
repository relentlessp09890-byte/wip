'use client'
import { useState, useEffect } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { formatCurrency, formatTimestamp } from '@/lib/normalizeSide'
import { getApiBase } from '@/lib/apiConfig'
import { ProGate } from '@/components/ui/ProGate'

const EMOTIONAL_TAGS = [
  { id: 'conviction',  label: 'Conviction',   color: 'text-risk-safe' },
  { id: 'fomo',        label: 'FOMO',         color: 'text-risk-warning' },
  { id: 'revenge',     label: 'Revenge',      color: 'text-risk-danger' },
  { id: 'plan',        label: 'On plan',      color: 'text-risk-safe' },
  { id: 'impulsive',   label: 'Impulsive',    color: 'text-risk-warning' },
  { id: 'overtrade',   label: 'Overtrade',    color: 'text-risk-danger' },
]

function GradeCircle({ grade, score }: { grade: string; score: number }) {
  const color = grade === 'A' ? 'text-risk-safe border-risk-safe/30' :
                grade === 'B' ? 'text-blue-400 border-blue-400/30' :
                grade === 'C' ? 'text-risk-warning border-risk-warning/30' :
                                'text-risk-danger border-risk-danger/30'
  return (
    <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center ${color}`}>
      <span className="text-lg font-mono font-medium leading-none">{grade}</span>
      <span className="text-2xs opacity-60">{score}%</span>
    </div>
  )
}

export default function LogPanel() {
  const { decisions, setDecisions } = useMarqStore()
  const [discipline, setDiscipline] = useState<any>(null)
  const [tagging, setTagging] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [showSummary, setShowSummary] = useState(false)
  const apiBase = getApiBase()

  useEffect(() => {
    fetch(`${apiBase}/api/risk/journal/discipline`)
      .then(r => r.json())
      .then(setDiscipline)
      .catch(console.error)
  }, [decisions.length])

  useEffect(() => {
    async function loadJournal() {
      try {
        const res = await fetch(`${apiBase}/api/risk/journal`)
        if (!res.ok) return
        const entries = await res.json()
        if (!Array.isArray(entries)) return
        const store = useMarqStore.getState()
        entries.forEach((e: any) => {
          store.addDecision({
            id: e.id,
            timestamp: e.timestamp,
            ticker: e.ticker,
            side: e.side,
            size: e.size,
            entryPrice: e.entry_price,
            exitPrice: e.exit_price ?? null,
            pnl: e.pnl ?? null,
            marginAtEntry: e.margin_at_entry,
            riskScoreAtEntry: e.risk_score_at_entry,
            gateOverridden: e.gate_overridden,
            emotionalTag: e.emotional_tag ?? null,
            notes: e.notes ?? null,
          })
        })
      } catch (e) {
        console.error('[loadJournal]', e)
      }
    }
    loadJournal()
  }, [])

  async function applyTag(entryId: string, tag: string) {
    try {
      const res = await fetch(`${apiBase}/api/risk/journal/tag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, tag }),
      })
      if (!res.ok) throw new Error('Tag update failed')
      const updated = await res.json()
      setDecisions(decisions.map(d =>
        d.id === entryId ? { ...d, emotionalTag: updated.emotional_tag || tag } : d
      ))
    } catch (e) {
      console.error('[applyTag]', e)
    } finally {
      setTagging(null)
    }
  }

  async function exportCSV() {
    const res = await fetch('/api/proxy/api/risk/journal/export/csv')
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `marqbridge_journal_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function loadSummary() {
    const res = await fetch('/api/proxy/api/risk/journal/export/summary')
    if (!res.ok) return
    const data = await res.json()
    setSummary(data)
    setShowSummary(true)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">Decision ledger</p>
          <h2 className="text-lg font-medium text-white">Trade journal</h2>
        </div>
        <ProGate feature="Performance report requires Pro">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              {decisions.length} record{decisions.length !== 1 ? 's' : ''}
            </span>
            <button onClick={loadSummary}
              className="text-xs px-3 py-1.5 rounded-lg border border-terminal-border
                         text-gray-500 hover:text-gray-300 hover:border-terminal-muted
                         transition-colors">
              Performance report
            </button>
            <button onClick={exportCSV}
              disabled={decisions.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-terminal-border
                         text-gray-500 hover:text-brand-gold hover:border-brand-gold/30
                         transition-colors disabled:opacity-30">
              Export CSV
            </button>
          </div>
        </ProGate>
      </div>

      {discipline && (
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <div className="flex items-center gap-5">
            <GradeCircle grade={discipline.grade ?? '—'} score={discipline.score ?? 0} />
            <div className="flex-1">
              <p className="label-caps mb-2">Discipline score</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Total trades', discipline.total_trades ?? 0],
                  ['Gate respected', discipline.gate_respected ?? 0],
                  ['Overridden', discipline.gate_overridden ?? 0],
                  ['Win rate', `${discipline.win_rate ?? 0}%`],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-2xs text-gray-600">{l}</p>
                    <p className="text-sm font-mono text-white mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {discipline.patterns?.length > 0 && (
            <div className="mt-4 space-y-2">
              {discipline.patterns.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-risk-warning bg-risk-warning/5 border border-risk-warning/15 rounded-lg px-3 py-2">
                  <span className="w-1 h-1 rounded-full bg-risk-warning mt-1.5 flex-shrink-0" />
                  {p.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showSummary && summary && (
        <div className="bg-terminal-surface border border-terminal-border
                        rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-caps">Performance report</span>
            <button onClick={() => setShowSummary(false)}
              className="text-gray-700 hover:text-gray-400 text-xs transition-colors">
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total P&L',      value: formatCurrency(summary.total_pnl),
                color: summary.total_pnl >= 0 ? 'text-risk-safe' : 'text-risk-danger' },
              { label: 'Win rate',       value: summary.win_rate + '%',         color: '' },
              { label: 'Profit factor',  value: summary.profit_factor + 'x',    color: '' },
              { label: 'Discipline',     value: summary.discipline_pct + '%',   color: '' },
              { label: 'Avg win',        value: formatCurrency(summary.avg_win),
                color: 'text-risk-safe' },
              { label: 'Avg loss',       value: formatCurrency(summary.avg_loss),
                color: 'text-risk-danger' },
              { label: 'Gate overrides', value: summary.gate_overrides,         color: '' },
              { label: 'Closed trades',  value: summary.closed_trades,          color: '' },
            ].map(({ label, value, color }) => (
              <div key={label}
                className="bg-terminal-elevated rounded-xl p-3 space-y-1">
                <p className="label-caps">{label}</p>
                <p className={`text-sm font-mono font-medium ${color || 'text-white'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {summary.by_emotion && Object.keys(summary.by_emotion).length > 0 && (
            <div>
              <p className="label-caps mb-3">P&L by emotional state</p>
              <div className="space-y-2">
                {Object.entries(summary.by_emotion).map(([tag, data]: [string, any]) => (
                  <div key={tag}
                    className="flex items-center justify-between text-xs py-1.5
                               border-b border-terminal-border/40 last:border-0">
                    <span className="text-gray-500 capitalize">{tag}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">{data.count} trades</span>
                      <span className={`font-mono ${
                        data.pnl >= 0 ? 'text-risk-safe' : 'text-risk-danger'
                      }`}>{formatCurrency(data.pnl)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {decisions.length === 0 ? (
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-10 text-center">
          <p className="text-sm text-gray-600">No decisions logged yet.</p>
          <p className="text-xs text-gray-700 mt-1">
            Use the Decisions tab to evaluate and log trades.
          </p>
        </div>
      ) : (
        <div className="bg-terminal-surface border border-terminal-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{width:'130px'}}/>
                <col style={{width:'90px'}}/>
                <col style={{width:'70px'}}/>
                <col style={{width:'90px'}}/>
                <col style={{width:'90px'}}/>
                <col style={{width:'90px'}}/>
                <col style={{width:'70px'}}/>
                <col style={{width:'80px'}}/>
                <col style={{width:'120px'}}/>
              </colgroup>
              <thead>
                <tr className="border-b border-terminal-border">
                  {['Time','Ticker','Side','Entry','Exit','P&L','Score','Gate','Emotion'].map(h => (
                    <th key={h} className="px-3 py-3 text-left label-caps font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions.map(d => (
                  <tr key={d.id} className="border-b border-terminal-border/40 hover:bg-terminal-elevated transition-colors">
                    <td className="px-3 py-2.5 font-mono text-gray-600 text-2xs">{formatTimestamp(d.timestamp)}</td>
                    <td className="px-3 py-2.5 font-mono text-white">{d.ticker}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-2xs px-1.5 py-0.5 rounded font-mono font-medium ${
                        d.side === 'LONG'
                          ? 'bg-risk-safe/10 text-risk-safe'
                          : d.side === 'SHORT'
                          ? 'bg-risk-danger/10 text-risk-danger'
                          : 'bg-terminal-muted text-gray-500'
                      }`}>
                        {d.side}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-300">{formatCurrency(d.entryPrice)}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600">{d.exitPrice ? formatCurrency(d.exitPrice) : '—'}</td>
                    <td className={`px-3 py-2.5 font-mono ${
                      d.pnl == null ? 'text-gray-700' :
                      d.pnl >= 0 ? 'text-risk-safe' : 'text-risk-danger'
                    }`}>
                      {d.pnl != null ? (d.pnl >= 0 ? '+' : '') + formatCurrency(d.pnl) : 'Open'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-500">{d.riskScoreAtEntry}</td>
                    <td className="px-3 py-2.5">
                      {d.gateOverridden ? (
                        <span className="text-2xs text-risk-warning bg-risk-warning/10 px-1.5 py-0.5 rounded">Override</span>
                      ) : (
                        <span className="text-2xs text-risk-safe bg-risk-safe/10 px-1.5 py-0.5 rounded">Clear</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {tagging === d.id ? (
                        <div className="flex flex-wrap gap-1">
                          {EMOTIONAL_TAGS.map(t => (
                            <button key={t.id}
                              onClick={() => applyTag(d.id, t.id)}
                              className={`text-2xs px-1.5 py-0.5 rounded bg-terminal-elevated border border-terminal-border hover:border-brand-gold/30 ${t.color} transition-colors`}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => setTagging(d.id)}
                          className="text-2xs text-gray-700 hover:text-gray-400 transition-colors"
                        >
                          {d.emotionalTag
                            ? EMOTIONAL_TAGS.find(t => t.id === d.emotionalTag)
                                ?.label ?? d.emotionalTag
                            : '+ tag'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
