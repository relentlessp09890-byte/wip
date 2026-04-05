'use client'
import { useState, useEffect } from 'react'
import { hasProp } from '@/lib/tierGate'
import { ProGate } from '@/components/ui/ProGate'
import { formatCurrency } from '@/lib/normalizeSide'

export default function PropDeskPanel() {
  const [desk, setDesk] = useState<any>(null)
  const [deskId, setDeskId] = useState('')
  const [creating, setCreating] = useState(false)
  const [newDesk, setNewDesk] = useState({
    name: '',
    daily_loss_limit: 1000,
    max_margin_per_acct: 50,
    circuit_breaker_losses: 3,
  })
  const apiBase = '/api/proxy'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('marq_prop_desk_id')
    if (saved) {
      setDeskId(saved)
      loadDesk(saved)
    }
  }, [])

  async function loadDesk(id: string) {
    try {
      const res = await fetch(`${apiBase}/api/prop/desk/${id}`)
      if (res.ok) {
        const data = await res.json()
        if (!data.error) setDesk(data)
      }
    } catch {
      // ignore
    }
  }

  async function createDesk() {
    setCreating(true)
    try {
      const res = await fetch(`${apiBase}/api/prop/desk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDesk),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('marq_prop_desk_id', data.id)
        setDeskId(data.id)
        await loadDesk(data.id)
      }
    } catch {
      // ignore
    }
    setCreating(false)
  }

  async function exportCompliance() {
    if (!deskId) return
    const res = await fetch(`${apiBase}/api/prop/desk/${deskId}/compliance`)
    if (!res.ok) return
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marqbridge_compliance_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!hasProp()) {
    return (
      <div className="p-6">
        <ProGate feature="Prop Desk requires Prop Desk tier ($99/mo)">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-8 space-y-3">
            <p className="text-sm font-medium text-white">Prop Desk</p>
            <p className="text-xs text-gray-600">
              Multi-account risk management, shared circuit breaker rules,
              compliance export.
            </p>
          </div>
        </ProGate>
      </div>
    )
  }

  if (!desk) {
    return (
      <div className="p-6 space-y-5 max-w-lg">
        <div>
          <p className="label-caps mb-0.5">Prop Desk</p>
          <h2 className="text-lg font-medium text-white">Create your desk</h2>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-4">
          {[
            { key: 'name', label: 'Desk name', type: 'text', placeholder: 'Apex Trading Desk' },
          ].map(f => (
            <div key={f.key}>
              <label className="label-caps block mb-1.5">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={newDesk[f.key as 'name']}
                onChange={e => setNewDesk(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-terminal-elevated border border-terminal-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-gold/40 transition-colors"
              />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'daily_loss_limit', label: 'Daily loss limit ($)' },
              { key: 'max_margin_per_acct', label: 'Max margin per trader (%)' },
              { key: 'circuit_breaker_losses', label: 'CB after N losses' },
            ].map(f => (
              <div key={f.key}>
                <label className="label-caps block mb-1.5 text-2xs">{f.label}</label>
                <input
                  type="number"
                  value={newDesk[f.key as keyof typeof newDesk]}
                  onChange={e => setNewDesk(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                  className="w-full bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold/40 transition-colors"
                />
              </div>
            ))}
          </div>

          <button
            onClick={createDesk}
            disabled={!newDesk.name || creating}
            className="w-full py-3 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create prop desk →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">Prop Desk</p>
          <h2 className="text-lg font-medium text-white">{desk.name}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCompliance}
            className="text-xs px-3 py-1.5 rounded-lg border border-terminal-border text-gray-500 hover:text-brand-gold hover:border-brand-gold/30 transition-colors"
          >
            Export compliance
          </button>
          <button
            onClick={() => loadDesk(deskId)}
            className="text-xs px-3 py-1.5 rounded-lg border border-terminal-border text-gray-500 hover:text-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-3">
        <span className="label-caps">Shared risk rules</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['Daily loss limit', formatCurrency(desk.rules.daily_loss_limit)],
            ['Max margin / trader', desk.rules.max_margin_per_acct + '%'],
            ['CB after losses', desk.rules.circuit_breaker_losses + ' losses'],
          ].map(([l, v]) => (
            <div key={l} className="bg-terminal-elevated rounded-xl p-3">
              <p className="label-caps mb-1">{l}</p>
              <p className="text-sm font-mono text-white">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-terminal-border flex items-center justify-between">
          <span className="label-caps">Traders</span>
          <span className="text-2xs text-gray-600">
            {desk.trader_count} / {desk.max_traders || 10}
          </span>
        </div>
        {desk.traders.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-600">No traders added yet.</p>
        ) : (
          <div className="divide-y divide-terminal-border/40">
            {desk.traders.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-white">{t.name}</p>
                  <p className="text-2xs text-gray-600 font-mono">
                    {t.exchange.toUpperCase()} · {t.api_key_hint}
                  </p>
                </div>
                <span className={`text-2xs px-2 py-0.5 rounded border ${t.active ? 'text-risk-safe bg-risk-safe/10 border-risk-safe/20' : 'text-gray-600 bg-terminal-muted border-terminal-border'}`}>
                  {t.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
