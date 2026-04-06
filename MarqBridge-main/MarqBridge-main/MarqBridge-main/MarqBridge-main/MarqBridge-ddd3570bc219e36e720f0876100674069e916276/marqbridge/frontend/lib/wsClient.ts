import { useMarqStore } from '@/store/useMarqStore'
import { normalizeSide } from './normalizeSide'
import { evaluateAlerts, evaluateSessionAlerts, notifyBrokerConnected, notifyBrokerDisconnected } from './riskAlerts'
import { evaluateLiquidationAlerts, requestNotificationPermission } from './liquidationEngine'
import { useNotifStore } from '@/components/ui/NotificationSystem'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let prevCbLocked = false
const MAX_RECONNECT = 5
let pollInterval: ReturnType<typeof setInterval> | null = null

async function getWsToken(): Promise<string> {
  try {
    const res = await fetch('/api/proxy/api/account/ws-token')
    if (res.ok) {
      const data = await res.json()
      return data.token || ''
    }
  } catch {}
  return ''
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws'

  const host     = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  // Codespaces pattern:
  // fluffy-system-xxx-3000.app.github.dev
  // → fluffy-system-xxx-8000.app.github.dev
  if (host.includes('.app.github.dev')) {
    // Replace the port segment regardless of port number
    // Handles: -3000. -4000. -8080. etc.
    const wsHost = host.replace(/-(\d+)\.app\.github\.dev/, '-8000.app.github.dev')
    console.log('[MarqBridge WS] Codespaces URL:', `${protocol}//${wsHost}/ws`)
    return `${protocol}//${wsHost}/ws`
  }

  // Local dev
  return 'ws://localhost:8000/ws'
}

export async function connectWS() {
  if (typeof window === 'undefined') return
  if (ws && ws.readyState === WebSocket.OPEN) return
  const token = await getWsToken()
  const wsUrl = getWsUrl()

  ws = new WebSocket(`${wsUrl}?token=${token}`)

  ws.onopen = () => {
    reconnectAttempts = 0
    stopHttpPolling()  // ← ADD THIS
    const state = useMarqStore.getState()
    state.setConnected(true)
    state.setLatency(Date.now())
    requestNotificationPermission()
    notifyBrokerConnected(state.broker?.exchange || 'broker')
    console.log('[MarqBridge WS] Connected')
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      const store = useMarqStore.getState()

      if (msg.type === 'SESSION_SWITCH') {
        // ATOMIC: clear everything first
        store.setConnected(false)
        store.setPositions([])
        store.setAccount({
          equity: 0,
          balance: 0,
          marginLevel: 0,
          freeMargin: 0,
          usedMargin: 0,
          liquidationProximity: 0,
          riskLevel: 'SAFE',
          heat: 'NORMAL',
          lastUpdated: Date.now(),
        })

        if (msg.mode === 'disconnected') return

        if (msg.market_type) {
          store.setMarketType(msg.market_type)
        }

        if (typeof msg.session_open === 'boolean') {
          store.setSessionOpen(msg.session_open)
          evaluateSessionAlerts(msg.session_open, msg.market_type ?? null)
        }

        if (msg.account) {
          store.setAccount({
            equity: Number(msg.account.equity ?? 0),
            balance: Number(msg.account.balance ?? 0),
            marginLevel: Number(msg.account.margin_level ?? 0),
            freeMargin: Number(msg.account.free_margin ?? 0),
            usedMargin: Number(msg.account.used_margin ?? 0),
            liquidationProximity: Number(msg.account.liquidation_proximity ?? 0),
            riskLevel: msg.account.risk_level ?? 'SAFE',
            heat: msg.account.heat ?? 'NORMAL',
            lastUpdated: Number(msg.account.last_updated ?? Date.now()),
          })
        }

        if (Array.isArray(msg.positions)) {
          store.setPositions(
            msg.positions.map((p: any) => ({
              id: p.id,
              ticker: p.ticker,
              side: normalizeSide(p.side),
              size: p.size,
              entryPrice: p.entry_price,
              currentPrice: p.current_price,
              pnl: p.pnl,
              pnlPct: p.pnl_pct,
              marginUsed: p.margin_used,
              liquidationPrice: p.liquidation_price,
              distanceToLiq: p.distance_to_liq,
              openedAt: p.opened_at,
            }))
          )
        }

        if (msg.price_map && Object.keys(msg.price_map).length > 0) {
          const extractedPrices = Object.entries(msg.price_map).reduce(
            (acc, [ticker, data]) => {
              acc[ticker] = typeof data === 'object' && data !== null && 'price' in data
                ? Number(data.price ?? 0)
                : Number(data ?? 0)
              return acc
            },
            {} as Record<string, number>
          )
          useMarqStore.getState().setPriceMap(extractedPrices)
        }

        if (msg.risk) {
          store.setRiskScore({
            overall: msg.risk.overall,
            axes: msg.risk.axes,
            level: msg.risk.level,
            heat: msg.risk.heat,
            ts: msg.risk.ts,
          })
        }

        store.setConnected(true)

        // Notify user of the switch
        const { push } = useNotifStore.getState()
        if (msg.mode === 'demo') {
          push({
            level: 'info',
            title: 'Demo mode active',
            message: 'Showing simulated data. Connect a real broker for live account.',
            persistent: false,
          })
        } else if (msg.mode === 'live') {
          push({
            level: 'success',
            title: `${msg.exchange?.toUpperCase()} connected`,
            message: `Live data streaming. Equity: $${(msg.account?.equity ?? 0).toLocaleString()}`,
            persistent: false,
          })
        }

        const state = useMarqStore.getState()
        if (state.account && state.riskScore) {
          evaluateAlerts(state.account, state.riskScore)
        }

        return
      }

      if (msg.type === 'STATE_UPDATE') {
        if (msg.account) {
          store.setAccount({
            equity: Number(msg.account.equity ?? 0),
            balance: Number(msg.account.balance ?? 0),
            marginLevel: Number(msg.account.margin_level ?? 0),
            freeMargin: Number(msg.account.free_margin ?? 0),
            usedMargin: Number(msg.account.used_margin ?? 0),
            liquidationProximity: Number(msg.account.liquidation_proximity ?? 0),
            riskLevel: msg.account.risk_level ?? 'SAFE',
            heat: msg.account.heat ?? 'NORMAL',
            lastUpdated: Number(msg.account.last_updated ?? Date.now()),
          })
        }

        if (msg.positions) {
          store.setPositions(
            msg.positions.map((p: any) => ({
              id: String(p.id),
              ticker: String(p.ticker || 'UNKNOWN'),
              side: normalizeSide(p.side),
              size: Number(p.size ?? 0),
              entryPrice: Number(p.entry_price ?? 0),
              currentPrice: Number(p.current_price ?? 0),
              pnl: Number(p.pnl ?? 0),
              pnlPct: Number(p.pnl_pct ?? 0),
              marginUsed: Number(p.margin_used ?? 0),
              liquidationPrice: Number(p.liquidation_price ?? 0),
              distanceToLiq: Number(p.distance_to_liq ?? 999),
              openedAt: Number(p.opened_at ?? Date.now()),
            }))
          )
          evaluateLiquidationAlerts(store.positions)
        }

        if (msg.price_map && Object.keys(msg.price_map).length > 0) {
          // Extract price values from nested {price, pnl} objects
          const extractedPrices = Object.entries(msg.price_map).reduce(
            (acc, [ticker, data]) => {
              acc[ticker] = typeof data === 'object' && data !== null && 'price' in data
                ? Number(data.price ?? 0)
                : Number(data ?? 0)
              return acc
            },
            {} as Record<string, number>
          )
          useMarqStore.getState().setPriceMap(extractedPrices)
        }

        if (msg.market_type) {
          store.setMarketType(msg.market_type)
          console.debug('[MarqBridge WS] market_type', msg.market_type,
            'session_open', msg.session_open)
        }

        if (typeof msg.session_open === 'boolean') {
          store.setSessionOpen(msg.session_open)
          evaluateSessionAlerts(msg.session_open, msg.market_type ?? null)
        }

        if (msg.risk) {
          store.setRiskScore({
            overall: msg.risk.overall,
            axes: msg.risk.axes,
            level: msg.risk.level,
            heat: msg.risk.heat,
            ts: msg.risk.ts,
          })
        }

        if (msg.circuit_breaker) {
          if (msg.circuit_breaker.locked && !prevCbLocked) {
            useNotifStore.getState().push({
              level: 'critical',
              title: 'Circuit breaker activated',
              message: msg.circuit_breaker.reason || 'Session locked.',
              persistent: true,
            })
          }
          prevCbLocked = msg.circuit_breaker.locked
        }

        const state = useMarqStore.getState()
        if (state.account && state.riskScore) {
          evaluateAlerts(state.account, state.riskScore)
        }
      }
    } catch (e) {
      console.error('[MarqBridge WS] Parse error', e)
    }
  }

  ws.onclose = () => {
    useMarqStore.getState().setConnected(false)
    // Only reconnect if we haven't exceeded attempts
    if (reconnectAttempts < MAX_RECONNECT) {
      scheduleReconnect()
    } else {
      console.warn('[MarqBridge WS] Max reconnects reached. Using HTTP polling.')
      startHttpPolling()
    }
  }

  ws.onerror = () => {
    // Silent — onclose will handle reconnect
    ws?.close()
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.warn('[MarqBridge WS] Max reconnect attempts reached')
    return
  }

  const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
  reconnectAttempts += 1
  reconnectTimer = setTimeout(connectWS, delay)
}

function startHttpPolling() {
  if (pollInterval) return
  console.log('[MarqBridge] Falling back to HTTP polling every 3s')

  pollInterval = setInterval(async () => {
    try {
      const store = useMarqStore.getState()
      if (!store.connected) return

      const [accRes, posRes] = await Promise.all([
        fetch('/api/proxy/api/account/state'),
        fetch('/api/proxy/api/positions/'),
      ])

      if (accRes.ok) {
        const acc = await accRes.json()
        if (!acc.error && acc.equity !== undefined) {
          store.setAccount({
            equity:               acc.equity ?? 0,
            balance:              acc.balance ?? 0,
            marginLevel:          acc.margin_level ?? 0,
            freeMargin:           acc.free_margin ?? 0,
            usedMargin:           acc.used_margin ?? 0,
            liquidationProximity: acc.liquidation_proximity ?? 0,
            riskLevel:            acc.risk_level ?? 'SAFE',
            heat:                 acc.heat ?? 'NORMAL',
            lastUpdated:          acc.last_updated ?? Date.now(),
          })
        }
      }

      if (posRes.ok) {
        const pos = await posRes.json()
        if (Array.isArray(pos)) {
          store.setPositions(pos.map((p: any) => ({
            id: p.id, ticker: p.ticker,
            side: p.side, size: p.size,
            entryPrice: p.entry_price,
            currentPrice: p.current_price,
            pnl: p.pnl, pnlPct: p.pnl_pct,
            marginUsed: p.margin_used,
            liquidationPrice: p.liquidation_price,
            distanceToLiq: p.distance_to_liq,
            openedAt: p.opened_at,
          })))
        }
      }
    } catch {}
  }, 3000)
}

export function stopHttpPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

export function disconnectWS() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  stopHttpPolling()
  ws?.close()
  ws = null
}
