'use client'

import { AudioEngine } from './audioEngine'
import { useNotifStore } from '@/components/ui/NotificationSystem'
import { Position } from '@/types'

type LiqTier = 'safe' | 'watch' | 'warning' | 'danger' | 'imminent'

interface PositionAlert {
  ticker: string
  tier: LiqTier
  distance: number
  alertedAt: number
}

const TIERS: { tier: LiqTier; threshold: number; cooldown: number }[] = [
  { tier: 'imminent', threshold: 2, cooldown: 30000 },
  { tier: 'danger', threshold: 7, cooldown: 60000 },
  { tier: 'warning', threshold: 15, cooldown: 120000 },
  { tier: 'watch', threshold: 30, cooldown: 300000 },
]

const _alertHistory = new Map<string, PositionAlert>()
let _fullscreenEl: HTMLElement | null = null

function getTier(distancePct: number): LiqTier {
  for (const t of TIERS) {
    if (distancePct <= t.threshold) return t.tier
  }
  return 'safe'
}

function getCooldown(tier: LiqTier): number {
  return TIERS.find((t) => t.tier === tier)?.cooldown ?? 300000
}

function shouldAlert(ticker: string, tier: LiqTier): boolean {
  if (tier === 'safe') return false
  const prev = _alertHistory.get(ticker)
  if (!prev) return true
  if (prev.tier !== tier) return true
  return Date.now() - prev.alertedAt > getCooldown(tier)
}

function sendBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (document.hasFocus()) return

  try {
    new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'marqbridge-liq',
      requireInteraction: true,
    })
  } catch {
    // ignore notification construction issues
  }
}

function triggerFullscreenAlert(pos: Position) {
  if (typeof document === 'undefined') return
  if (_fullscreenEl) return

  const el = document.createElement('div')
  el.id = 'marq-liq-overlay'
  el.innerHTML = `
    <div style="
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(239,68,68,0.12);
      border:2px solid rgba(239,68,68,0.6);
      z-index:99999;
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(2px);
    ">
      <div style="
        background:#0a0a0a;border:1px solid rgba(239,68,68,0.5);
        border-radius:16px;padding:32px 40px;max-width:400px;
        text-align:center;
      ">
        <div style="font-size:11px;letter-spacing:.08em;
                    color:#f87171;margin-bottom:8px;
                    text-transform:uppercase;">
          Liquidation imminent
        </div>
        <div style="font-size:24px;font-weight:500;color:#fff;
                    margin-bottom:8px;font-family:monospace;">
          ${pos.ticker} ${pos.side}
        </div>
        <div style="font-size:14px;color:#f87171;margin-bottom:4px;">
          ${pos.distanceToLiq.toFixed(2)}% from liquidation
        </div>
        <div style="font-size:12px;color:#6b6b6b;margin-bottom:24px;">
          Liq price: $${pos.liquidationPrice.toLocaleString()}
        </div>
        <button id="marq-liq-dismiss" style="
          padding:10px 24px;border-radius:10px;
          border:1px solid rgba(239,68,68,0.4);
          background:rgba(239,68,68,0.1);
          color:#f87171;font-size:13px;cursor:pointer;
        ">
          I understand — dismiss
        </button>
      </div>
    </div>
  `

  document.body.appendChild(el)
  _fullscreenEl = el

  const button = document.getElementById('marq-liq-dismiss')
  button?.addEventListener('click', () => {
    el.remove()
    _fullscreenEl = null
  })

  setTimeout(() => {
    if (_fullscreenEl) {
      el.remove()
      _fullscreenEl = null
    }
  }, 30000)
}

export function requestNotificationPermission() {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'default') return

  Notification.requestPermission().catch(() => {})
}

export function evaluateLiquidationAlerts(positions: Position[]) {
  const { push } = useNotifStore.getState()

  for (const pos of positions) {
    const dist = Number(pos.distanceToLiq)
    if (!Number.isFinite(dist) || dist >= 999) continue

    const tier = getTier(dist)
    if (!shouldAlert(pos.ticker, tier)) continue

    _alertHistory.set(pos.ticker, {
      ticker: pos.ticker,
      tier,
      distance: dist,
      alertedAt: Date.now(),
    })

    if (tier === 'watch') {
      AudioEngine.marginWarning()
      push({
        level: 'info',
        title: `${pos.ticker} — liq watch`,
        message: `${pos.side} position is ${dist.toFixed(1)}% from liquidation. Monitor closely.`,
        persistent: false,
      })
    }

    if (tier === 'warning') {
      AudioEngine.liquidationAlert()
      push({
        level: 'warning',
        title: `${pos.ticker} — liq warning`,
        message: `${dist.toFixed(1)}% from liquidation at $${pos.liquidationPrice.toLocaleString()}. Consider reducing size.`,
        persistent: false,
      })
    }

    if (tier === 'danger') {
      AudioEngine.liquidationDanger()
      push({
        level: 'critical',
        title: `${pos.ticker} — liq danger`,
        message: `Only ${dist.toFixed(1)}% from liquidation. Immediate action required.`,
        persistent: true,
      })
      sendBrowserNotification(
        `⚠ ${pos.ticker} liquidation danger`,
        `${dist.toFixed(1)}% from liq at $${pos.liquidationPrice.toLocaleString()}`
      )
    }

    if (tier === 'imminent') {
      AudioEngine.liquidationImminent()
      push({
        level: 'critical',
        title: `${pos.ticker} — LIQUIDATION IMMINENT`,
        message: `${dist.toFixed(1)}% from liquidation. CLOSE OR HEDGE NOW.`,
        persistent: true,
      })
      sendBrowserNotification(
        `🚨 LIQUIDATION IMMINENT — ${pos.ticker}`,
        `Only ${dist.toFixed(1)}% remaining. Immediate action required.`
      )
      triggerFullscreenAlert(pos)
    }
  }
}
