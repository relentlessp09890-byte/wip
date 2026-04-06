export type Tier = 'free' | 'pro' | 'prop'

export async function validateTierServer(): Promise<Tier> {
  try {
    const res = await fetch('/api/proxy/api/billing/status')
    if (!res.ok) return 'free'
    const data = await res.json()
    if (data.tier) {
      localStorage.setItem('marq_tier', data.tier)
      return data.tier
    }
  } catch {}
  return (localStorage.getItem('marq_tier') as Tier) || 'free'
}

export function getCurrentTier(): Tier {
  try {
    return (localStorage.getItem('marq_tier') as Tier) ?? 'free'
  } catch {
    return 'free'
  }
}

export function hasPro(): boolean {
  const t = getCurrentTier()
  return t === 'pro' || t === 'prop'
}

export function hasProp(): boolean {
  return getCurrentTier() === 'prop'
}

export const PREMIUM_FEATURES = {
  ai_news:          { tier: 'pro' as Tier, label: 'AI news filter' },
  discipline_score: { tier: 'pro' as Tier, label: 'Discipline scoring' },
  loss_patterns:    { tier: 'pro' as Tier, label: 'Loss pattern detection' },
  export_csv:       { tier: 'pro' as Tier, label: 'CSV export' },
  unlimited_journal:{ tier: 'pro' as Tier, label: 'Unlimited journal' },
  regime_classifier:{ tier: 'pro' as Tier, label: 'Regime classifier' },
  team_accounts:    { tier: 'prop' as Tier, label: 'Team accounts' },
  compliance_export: { tier: 'prop' as Tier, label: 'Compliance export' },
  shared_cb:        { tier: 'prop' as Tier, label: 'Shared circuit breaker' },
}
