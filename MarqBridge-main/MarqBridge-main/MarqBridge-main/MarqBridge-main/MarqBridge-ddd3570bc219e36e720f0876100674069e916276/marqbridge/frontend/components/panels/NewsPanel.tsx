'use client'
import { useState, useEffect, useRef } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { getApiBase } from '@/lib/apiConfig'
import { notifyHighImpactNews } from '@/lib/riskAlerts'
import { NewsItemSkeleton } from '@/components/ui/Skeleton'
import { ProGate } from '@/components/ui/ProGate'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 9
    ? 'bg-risk-danger/15 text-risk-danger border-risk-danger/30'
    : score >= 7
    ? 'bg-risk-warning/15 text-risk-warning border-risk-warning/30'
    : 'bg-terminal-elevated text-gray-500 border-terminal-border'

  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      {score}
    </span>
  )
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1 bg-terminal-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-2xs font-mono text-gray-700">{value}</span>
    </div>
  )
}

export default function NewsPanel() {
  const { positions } = useMarqStore()
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(7)
  const [filter, setFilter] = useState('all')
  const apiBase = getApiBase()

  useEffect(() => {
    loadNews()
    const interval = setInterval(loadNews, 60000)
    return () => clearInterval(interval)
  }, [positions.length])

  const notifiedIds = useRef<Set<string>>(new Set())

  async function loadNews() {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/news/`)
      if (!res.ok) {
        setNews([])
        return
      }
      const raw = await res.json()
      const data = Array.isArray(raw) ? raw : []
      setNews(data)
      const critical = data.filter((n: any) => n.score >= 8)
      critical.forEach((item: any) => {
        if (!notifiedIds.current.has(item.id)) {
          notifiedIds.current.add(item.id)
          notifyHighImpactNews(item.headline, item.score)
        }
      })
    } catch (e) {
      console.error('[NewsPanel]', e)
      setNews([])
    } finally {
      setLoading(false)
    }
  }

  const myTickers = positions.map((p) => p.ticker)
  const filtered = news
    .filter((n) => n.score >= threshold)
    .filter((n) => filter === 'all' || n.category === filter)

  const suppressed = news.filter((n) => n.score < threshold).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">News intelligence</p>
          <h2 className="text-lg font-medium text-white">Position-aware filter</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-gray-700">{suppressed} suppressed</span>
          <span className="w-1.5 h-1.5 rounded-full bg-risk-safe animate-pulse" />
          <span className="text-xs text-risk-safe">live</span>
        </div>
      </div>

      <ProGate feature="AI news filter requires Pro">
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            {['all', 'crypto', 'macro', 'equity', 'forex'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                  filter === f
                    ? 'border-brand-gold/40 text-brand-gold bg-brand-gold/5'
                    : 'border-terminal-border text-gray-600 hover:text-gray-400'
                }`}>
                {f}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-600">Min score</span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs font-mono text-brand-gold w-4">{threshold}</span>
            </div>
          </div>

          <div className="space-y-3">
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <NewsItemSkeleton key={i} />
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="bg-terminal-surface border border-terminal-border rounded-xl p-8 text-center">
                <p className="text-sm text-gray-600">Terminal clear</p>
                <p className="text-xs text-gray-700 mt-1">
                  No items above score {threshold}.
                  {suppressed > 0 && ` ${suppressed} lower-impact items suppressed.`}
                </p>
              </div>
            )}

            {!loading && filtered.map((item) => {
              const hot = item.tickers?.some((t: string) => myTickers.includes(t))
              return (
                <div
                  key={item.id}
                  className={`bg-terminal-surface rounded-xl p-4 space-y-2 border transition-colors ${
                    hot
                      ? 'border-risk-warning/30 bg-risk-warning/3'
                      : 'border-terminal-border'
                  }`}>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={item.score} />
                    {item.tickers?.map((t: string) => (
                      <span
                        key={t}
                        className={`text-2xs px-1.5 py-0.5 rounded font-mono border ${
                          myTickers.includes(t)
                            ? 'text-risk-safe bg-risk-safe/10 border-risk-safe/20'
                            : 'text-gray-600 bg-terminal-elevated border-terminal-border'
                        }`}>
                        {t}
                      </span>
                    ))}
                    <span className="text-2xs text-gray-700 ml-auto">{timeAgo(item.published_at)}</span>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed">{item.headline}</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xs text-gray-700 mb-0.5">Market impact</p>
                      <MiniBar value={item.market_impact} color="bg-risk-warning" />
                    </div>
                    <div>
                      <p className="text-2xs text-gray-700 mb-0.5">Your positions</p>
                      <MiniBar value={item.position_relevance} color="bg-risk-safe" />
                    </div>
                    <div className="ml-auto text-2xs text-gray-700">
                      {item.source} · {item.category}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </ProGate>
    </div>
  )
}
