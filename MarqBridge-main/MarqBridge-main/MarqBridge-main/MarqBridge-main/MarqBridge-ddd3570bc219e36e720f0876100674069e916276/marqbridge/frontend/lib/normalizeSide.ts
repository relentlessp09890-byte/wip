import { Side } from '@/types'

export function normalizeSide(raw: unknown): Side {
  if (!raw) return 'UNKNOWN'
  const s = String(raw).toUpperCase().trim()
  if (['BUY', 'LONG', '1', 'B', 'OPEN_LONG'].includes(s)) return 'LONG'
  if (['SELL', 'SHORT', '-1', 'S', 'OPEN_SHORT'].includes(s)) return 'SHORT'
  return 'UNKNOWN'
}

export function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

export function formatPrice(
  price: number,
  marketType?: string | null
): string {
  const n = Number(price)
  if (isNaN(n)) return '—'
  if (marketType === 'forex') {
    return n.toFixed(5)
  }
  if (marketType === 'india') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(n)
  }
  if (n > 1000) return formatCurrency(n)
  if (n > 1) return '$' + n.toFixed(4)
  return '$' + n.toFixed(6)
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const num = Number(n)
  if (isNaN(num)) return '—'
  return num.toFixed(2) + '%'
}
