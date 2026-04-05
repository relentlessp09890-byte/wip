import { useNotifStore } from '@/components/ui/NotificationSystem'
import { AccountState, RiskScore } from '@/types'
import { AudioEngine } from '@/lib/audioEngine'

let prevMarginLevel: number | null = null
let prevRiskOverall: number | null = null
let circuitOpen = false
let prevSessionOpen: boolean | null = null

export function evaluateAlerts(
  account: AccountState,
  riskScore: RiskScore | null,
) {
  const { push } = useNotifStore.getState()
  if (!account) return

  if (prevMarginLevel !== null) {
    if (account.marginLevel < 150 && prevMarginLevel >= 150) {
      AudioEngine.marginWarning()
      push({
        level: 'warning',
        title: 'Margin warning',
        message: `Margin level dropped to ${Number(account.marginLevel).toFixed(1)}% — approaching danger zone.`,
        persistent: false,
      })
    }

    if (account.marginLevel < 120 && prevMarginLevel >= 120) {
      AudioEngine.liquidationAlert()
      push({
        level: 'critical',
        title: 'Margin critical',
        message: `Margin at ${Number(account.marginLevel).toFixed(1)}%. Liquidation risk is now elevated.`,
        persistent: true,
      })
    }

    if (account.marginLevel < 110 && prevMarginLevel >= 110) {
      AudioEngine.liquidationDanger()
      push({
        level: 'critical',
        title: 'Liquidation imminent',
        message: 'Margin level below 110%. Positions may be liquidated. Reduce exposure immediately.',
        persistent: true,
        action: {
          label: 'Open stress test',
          onClick: () => useNotifStore.getState().push({
            level: 'info',
            title: 'Navigate to Decisions tab',
            message: 'Use the stress test to evaluate exit scenarios.',
            persistent: false,
          }),
        },
      })
    }
  }

  prevMarginLevel = account.marginLevel

  if (riskScore && prevRiskOverall !== null) {
    if (riskScore.overall >= 75 && prevRiskOverall < 75) {
      push({
        level: 'critical',
        title: 'Risk score critical',
        message: `Overall risk score hit ${riskScore.overall}/100. Review your exposure immediately.`,
        persistent: true,
      })
    } else if (riskScore.overall >= 50 && prevRiskOverall < 50) {
      push({
        level: 'warning',
        title: 'Risk score elevated',
        message: `Risk score at ${riskScore.overall}/100. Monitor positions closely.`,
        persistent: false,
      })
    }
  }

  if (riskScore) {
    prevRiskOverall = riskScore.overall
  }

  if (account.heat === 'EXTREME' && !circuitOpen) {
    circuitOpen = true
    push({
      level: 'critical',
      title: 'Circuit breaker activated',
      message: 'Session heat is EXTREME. New position entry is locked. Take a break.',
      persistent: true,
    })
  }

  if (account.heat !== 'EXTREME') {
    circuitOpen = false
  }
}

export function notifyBrokerConnected(exchange: string) {
  AudioEngine.connected()
  useNotifStore.getState().push({
    level: 'success',
    title: 'Broker connected',
    message: `${exchange.toUpperCase()} connected in read-only mode. Live data streaming.`,
    persistent: false,
  })
}

export function notifyBrokerDisconnected() {
  useNotifStore.getState().push({
    level: 'warning',
    title: 'Broker disconnected',
    message: 'Lost connection to broker. Reconnecting...',
    persistent: false,
  })
}

export function evaluateSessionAlerts(
  sessionOpen: boolean,
  marketType: string | null
) {
  if (prevSessionOpen === true && !sessionOpen && marketType) {
    useNotifStore.getState().push({
      level: 'info',
      title: 'Market session closed',
      message: `${marketType.toUpperCase()} session has ended. Price data will resume at next open.`,
      persistent: false,
    })
  }
  if (prevSessionOpen === false && sessionOpen && marketType) {
    useNotifStore.getState().push({
      level: 'success',
      title: 'Market session open',
      message: `${marketType.toUpperCase()} session is now live.`,
      persistent: false,
    })
  }
  prevSessionOpen = sessionOpen
}

export function notifyGateBlocked(reason: string) {
  useNotifStore.getState().push({
    level: 'warning',
    title: 'Risk gate blocked',
    message: reason,
    persistent: false,
  })
}

export function notifyDecisionLogged(ticker: string, side: string) {
  useNotifStore.getState().push({
    level: 'success',
    title: 'Decision logged',
    message: `${side} ${ticker} recorded in the decision journal.`,
    persistent: false,
  })
}

export function notifyHighImpactNews(headline: string, score: number) {
  useNotifStore.getState().push({
    level: score >= 9 ? 'critical' : 'warning',
    title: `News impact score ${score}`,
    message: headline.length > 90 ? `${headline.slice(0, 90)}...` : headline,
    persistent: score >= 9,
  })
}
