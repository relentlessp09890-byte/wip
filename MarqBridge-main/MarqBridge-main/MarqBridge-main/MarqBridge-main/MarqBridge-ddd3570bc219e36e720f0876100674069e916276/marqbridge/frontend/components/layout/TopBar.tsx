'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMarqStore } from '@/store/useMarqStore'
import { AudioEngine, unlockAudio } from '@/lib/audioEngine'
import { formatCurrency } from '@/lib/normalizeSide'
import { getApiBase } from '@/lib/apiConfig'
import { hasProp } from '@/lib/tierGate'
import { supabase, getCurrentUser, signOut } from '@/lib/supabase'
import Logo from '@/components/ui/Logo'

export default function TopBar() {
  const { connected, account, broker, marketType, sessionOpen, activeTab, setActiveTab, sidebarOpen, setSidebarOpen } = useMarqStore()
  const [cbLocked, setCbLocked] = useState(false)
  const [stale, setStale] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [dataAge, setDataAge] = useState(0)
  const apiBase = getApiBase()

  const TABS = hasProp()
    ? ['STATE', 'POSITIONS', 'DECISIONS', 'LOG', 'NEWS', 'PROP', 'INTEGRATIONS']
    : ['STATE', 'POSITIONS', 'DECISIONS', 'LOG', 'NEWS', 'INTEGRATIONS']

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const res = await fetch(`${apiBase}/api/risk/circuit-breaker`)
        if (!res.ok) return
        const data = await res.json()
        if (mounted && !data.error) setCbLocked(data.locked ?? false)
      } catch {
        // Silently fail — CB defaults to unlocked if backend unavailable
      }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [apiBase])

  useEffect(() => {
    const interval = setInterval(() => {
      const lastUpdate = useMarqStore.getState().account?.lastUpdated
      setStale(typeof lastUpdate === 'number' && Date.now() - lastUpdate > 10000)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      const last = useMarqStore.getState().account?.lastUpdated
      if (last) setDataAge(Math.floor((Date.now() - last) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    })
  }, [])

  async function installApp() {
    if (!installPrompt) return
    installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      setInstallPrompt(null)
      // Could add a notification here if you have a notification system
    }
  }

  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    getCurrentUser().then(current => {
      if (mounted) setUser(current)
    })
    const { data: sub } = supabase?.auth.onAuthStateChange((_, session) => {
      if (mounted) setUser(session?.user ?? null)
    }) ?? { data: null }
    return () => {
      mounted = false
      sub?.subscription.unsubscribe()
    }
  }, [])

  const riskColor = {
    SAFE: 'text-risk-safe',
    WARNING: 'text-risk-warning',
    DANGER: 'text-risk-danger',
    CRITICAL: 'text-risk-danger',
  }[account?.riskLevel ?? 'SAFE'] ?? 'text-risk-safe'

  return (
    <header className="h-14 bg-terminal-surface border-b border-terminal-border flex items-center px-6 gap-6 flex-shrink-0">
      <button
        className="lg:hidden mr-2 text-gray-600 hover:text-gray-400"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0" y="2" width="16" height="1.5" rx="0.75" />
          <rect x="0" y="7" width="16" height="1.5" rx="0.75" />
          <rect x="0" y="12" width="16" height="1.5" rx="0.75" />
        </svg>
      </button>

      <Logo size="sm" />

      <div className="flex items-center gap-3 flex-1">
        <div className="hidden md:flex items-center gap-1 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => {
                unlockAudio()
                AudioEngine.tap()
                setActiveTab(tab)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'text-brand-gold bg-brand-gold/10 border border-brand-gold/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-elevated'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="md:hidden text-xs font-medium text-gray-300">
          {activeTab}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {account && account.equity > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-600">Equity</span>
            <span className="font-mono text-white">{formatCurrency(account.equity)}</span>
            <span className="text-gray-600">Margin</span>
            <span className={`font-mono ${riskColor}`}>{Number(account.marginLevel).toFixed(1)}%</span>
          </div>
        )}
        {marketType && (
          <div className="flex items-center gap-1.5 text-2xs text-gray-600 uppercase tracking-wide">
            <span className={`w-1.5 h-1.5 rounded-full ${
              sessionOpen ? 'bg-risk-safe' : 'bg-gray-600'
            }`} />
            <span>{marketType}</span>
            {!sessionOpen && (
              <span className="text-gray-500">closed</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${
            connected ? 'bg-risk-safe animate-pulse' : 'bg-gray-700'
          }`} />
          <span className={connected ? 'text-risk-safe' : 'text-gray-600'}>
            {connected
              ? broker?.exchange
                ? `${broker.exchange} live`
                : 'connected'
              : 'offline'}
          </span>
          {broker?.exchange === 'demo' && (
            <span className="text-2xs px-2 py-0.5 rounded border
                             border-brand-gold/30 text-brand-gold bg-brand-gold/8
                             font-mono ml-1">
              DEMO
            </span>
          )}
        </div>
        {stale && connected && (
          <span className="text-2xs text-risk-warning">data stale</span>
        )}
        <span style={{
          fontSize: 10, fontFamily: 'monospace',
          color: dataAge > 15 ? '#f87171' : dataAge > 5 ? '#e0b84a' : '#4ade80',
        }}>
          {dataAge > 0 ? `${dataAge}s` : 'live'}
        </span>
        {cbLocked && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-risk-danger/40 bg-risk-danger/10">
            <span className="w-1.5 h-1.5 rounded-full bg-risk-danger animate-pulse" />
            <span className="text-2xs text-risk-danger font-medium">
              Circuit breaker active
            </span>
          </div>
        )}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center">
              <span className="text-2xs font-medium text-brand-gold">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => signOut().then(() => {
                setUser(null)
                router.push('/')
              })}
              className="text-2xs text-gray-700 hover:text-gray-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/auth')}
            className="text-2xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Sign in
          </button>
        )}
        {installPrompt && (
          <button onClick={installApp}
            className="text-2xs px-2 py-1 rounded border border-brand-gold/20
                       text-brand-gold/60 hover:text-brand-gold hover:border-brand-gold/40
                       transition-colors">
            Install app
          </button>
        )}
      </div>
    </header>
  )
}
