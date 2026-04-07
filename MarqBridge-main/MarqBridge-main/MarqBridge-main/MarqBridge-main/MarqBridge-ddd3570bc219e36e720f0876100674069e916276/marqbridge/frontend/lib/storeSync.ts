import { useMarqStore } from '@/store/useMarqStore'

export async function syncStoreNow(isDemo: boolean, exchangeName: string) {
  const store = useMarqStore.getState()

  try {
    const [accRes, posRes] = await Promise.allSettled([
      fetch('/api/proxy/api/account/state'),
      fetch('/api/proxy/api/positions/'),
    ])

    let accountLoaded = false

    if (accRes.status === 'fulfilled' && accRes.value.ok) {
      const acc = await accRes.value.json()
      if (acc && !acc.error && acc.equity !== undefined) {
        store.setAccount({
          equity:               Number(acc.equity)               || 0,
          balance:              Number(acc.balance)              || 0,
          marginLevel:          Number(acc.margin_level)         || 0,
          freeMargin:           Number(acc.free_margin)          || 0,
          usedMargin:           Number(acc.used_margin)          || 0,
          liquidationProximity: Number(acc.liquidation_proximity)|| 0,
          riskLevel:            acc.risk_level  || 'SAFE',
          heat:                 acc.heat        || 'NORMAL',
          lastUpdated:          acc.last_updated|| Date.now(),
        })
        accountLoaded = true
      }
    }

    if (posRes.status === 'fulfilled' && posRes.value.ok) {
      const pos = await posRes.value.json()
      if (Array.isArray(pos)) {
        store.setPositions(pos.map((p: any) => ({
          id:               String(p.id   || ''),
          ticker:           String(p.ticker|| ''),
          side:             (String(p.side  || 'UNKNOWN').toUpperCase() as 'LONG' | 'SHORT' | 'UNKNOWN'),
          size:             Number(p.size) || 0,
          entryPrice:       Number(p.entry_price)       || 0,
          currentPrice:     Number(p.current_price)     || 0,
          pnl:              Number(p.pnl)               || 0,
          pnlPct:           Number(p.pnl_pct)           || 0,
          marginUsed:       Number(p.margin_used)       || 0,
          liquidationPrice: Number(p.liquidation_price) || 0,
          distanceToLiq:    Number(p.distance_to_liq)   || 999,
          openedAt:         Number(p.opened_at)         || Date.now(),
        })))
      }
    }

    store.setConnected(accountLoaded)
    return accountLoaded

  } catch (e) {
    console.error('[storeSync] failed:', e)
    store.setConnected(false)
    return false
  }
}