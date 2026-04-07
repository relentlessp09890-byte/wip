'use client'
import { useState } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { notifyBrokerConnected } from '@/lib/riskAlerts'

const BROKERS = [
  {
    id: 'binance',
    name: 'Binance',
    type: 'Crypto futures & spot',
    region: ['Global', 'Crypto'],
    color: '#F0B90B',
    steps: ['Create API key in Binance → API Management',
            'Enable Read Only permissions only',
            'Whitelist your IP (optional but recommended)',
            'Copy API Key and Secret'],
  },
  {
    id: 'bybit',
    name: 'Bybit',
    type: 'Derivatives & spot',
    region: ['Global', 'Crypto'],
    color: '#F7A600',
    steps: ['Go to Bybit → Account → API Management',
            'Create new key → Read Only',
            'No withdrawal permissions needed',
            'Copy API Key and Secret'],
  },
  {
    id: 'okx',
    name: 'OKX',
    type: 'Institutional grade',
    region: ['Global', 'Crypto'],
    color: '#000000',
    steps: ['Navigate to OKX → User Center → API',
            'Create API → Read permission only',
            'Set passphrase you will remember',
            'Copy Key, Secret, Passphrase'],
  },
  {
    id: 'zerodha',
    name: 'Zerodha',
    type: 'Indian equities & F&O',
    region: ['India', 'NSE', 'BSE'],
    color: '#387ED1',
    steps: ['Login to Zerodha Kite → Profile → API',
            'Create new app → note API Key',
            'Generate access token via OAuth',
            'Paste token below'],
  },
  {
    id: 'angel',
    name: 'Angel One',
    type: 'Indian markets',
    region: ['India', 'NSE', 'BSE'],
    color: '#EF4444',
    steps: ['Open Angel One Smart API dashboard',
            'Create new app → Read Only scope',
            'Copy API Key and Client Code',
            'Paste credentials below'],
  },
  {
    id: 'interactive_brokers',
    name: 'IBKR',
    type: 'Multi-asset global',
    region: ['Global', 'Forex', 'Equities'],
    color: '#CC0000',
    steps: ['Open IBKR Client Portal',
            'Go to Settings → API → Paper Trading or Live',
            'Enable Client Portal API',
            'Copy account credentials'],
  },
  {
    id: 'oanda',
    name: 'OANDA',
    type: 'Forex & CFDs',
    region: ['Global', 'Forex'],
    color: '#00A86B',
    steps: ['Login to OANDA fxTrade',
            'Navigate to Manage API Access',
            'Generate personal access token',
            'Copy token below'],
  },
  {
    id: 'forex_com',
    name: 'FOREX.com',
    type: 'Forex & CFDs',
    region: ['Global', 'Forex'],
    color: '#1B4F72',
    steps: ['Login to FOREX.com platform',
            'Go to Settings → API Management',
            'Create read-only API credentials',
            'Copy API Key and Secret'],
  },
]

const REGIONS = ['All', 'Crypto', 'India', 'Forex', 'Global']

type Step = 'select' | 'guide' | 'credentials' | 'connecting' | 'success'

export default function BrokerOnboarding({
  onComplete
}: { onComplete: () => void }) {
  const { setBroker, setConnected, setAccount, setPositions } = useMarqStore()
  const [step, setStep]               = useState<Step>('select')
  const [region, setRegion]           = useState('All')
  const [selected, setSelected]       = useState<typeof BROKERS[0] | null>(null)
  const [apiKey, setApiKey]           = useState('')
  const [apiSecret, setApiSecret]     = useState('')
  const [passphrase, setPassphrase]   = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [progress, setProgress]       = useState(0)

  const filtered = BROKERS.filter(b =>
    region === 'All' || b.region.includes(region)
  )

  async function handleConnect() {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('Both API key and secret are required.')
      return
    }
    if (!selected) return

    setStep('connecting')
    setError(null)
    setProgress(0)

    const timer = setInterval(() => {
      setProgress(p => Math.min(p + 8, 85))
    }, 180)

    try {
      if (selected.id === 'zerodha') {
        const res = await fetch('/api/proxy/api/account/zerodha/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey.trim(),
            api_secret: apiSecret.trim(),
          }),
        })

        clearInterval(timer)

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setProgress(0)
          setError(err.detail || 'Connection failed. Check your Kite credentials.')
          setStep('credentials')
          return
        }

        const data = await res.json()
        if (!data.login_url) {
          setProgress(0)
          setError('Unable to generate Zerodha login URL.')
          setStep('credentials')
          return
        }

        const popup = window.open(data.login_url, '_blank', 'width=700,height=900')
        if (!popup) {
          setProgress(0)
          setError('Unable to open Zerodha login window. Allow pop-ups and try again.')
          setStep('credentials')
          return
        }

        setProgress(30)

        // Set up timeout for login completion
        const loginTimeout = setTimeout(() => {
          popup.close()
          setProgress(0)
          setError('Login timed out. Please try again and complete the Kite login within 5 minutes.')
          setStep('credentials')
        }, 5 * 60 * 1000) // 5 minutes

        // Listen for popup close (user cancelled)
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearTimeout(loginTimeout)
            clearInterval(checkClosed)
            setProgress(0)
            setError('Login window was closed. Please try again.')
            setStep('credentials')
          }
        }, 1000)

        window.addEventListener('message', async event => {
          if (event.data?.type !== 'zerodha-auth') return

          clearTimeout(loginTimeout)
          clearInterval(checkClosed)

          if (!event.data.success) {
            setProgress(0)
            setError('Zerodha login failed. Please check your credentials and try again.')
            setStep('credentials')
            return
          }

          try {
            setProgress(60)
            // Give backend a moment to process the callback
            await new Promise(resolve => setTimeout(resolve, 1000))
            const { syncStoreNow } = await import('@/lib/storeSync')
            await syncStoreNow(false, selected.name)
            setProgress(100)

            setBroker({
              exchange: selected.id as any,
              apiKey: apiKey.slice(0, 6) + '••••••••••',
              apiSecret: '••••••••••••••••',
              connected: true,
              lastSync: Date.now(),
            })
            setConnected(true)
            setApiKey('')
            setApiSecret('')
            setStep('success')
          } catch (error: any) {
            setProgress(0)
            setError(error.message || 'Zerodha connected, but failed to refresh account data.')
            setStep('credentials')
          }
        }, { once: true })

        return
      }

      const res = await fetch('/api/proxy/api/account/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange:   selected.id,
          api_key:    apiKey.trim(),
          api_secret: apiSecret.trim(),
        }),
      })

      clearInterval(timer)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setProgress(0)
        setError(err.detail || 'Connection failed. Check your API keys.')
        setStep('credentials')
        return
      }

      setProgress(100)

      setBroker({
        exchange:  selected.id as any,
        apiKey:    apiKey.slice(0, 6) + '••••••••••',
        apiSecret: '••••••••••••••••',
        connected:  true,
        lastSync:   Date.now(),
      })
      setConnected(true)

      // Sync store directly from HTTP right now
      const { syncStoreNow } = await import('@/lib/storeSync')
      await syncStoreNow(false, selected.name)

      setApiKey('')
      setApiSecret('')
      setStep('success')

    } catch (e: any) {
      clearInterval(timer)
      setProgress(0)
      setError(e.message || 'Unexpected error.')
      setStep('credentials')
    }
  }

  async function handleDemo() {
    setStep('connecting')
    setProgress(0)

    const timer = setInterval(() => {
      setProgress(p => Math.min(p + 20, 90))
    }, 100)

    try {
      const res = await fetch('/api/proxy/api/account/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      clearInterval(timer)

      if (!res.ok) {
        setProgress(0)
        setError('Demo failed. Is the backend running?')
        setStep('select')
        return
      }

      setProgress(100)

      setBroker({
        exchange:  'demo' as any,
        apiKey:    'demo-mode',
        apiSecret: 'demo-mode',
        connected:  true,
        lastSync:   Date.now(),
      })
      setConnected(true)

      setSelected({
        id: 'demo', name: 'Demo account',
        type: 'Simulated live data',
        region: ['Demo'], color: '#e0b84a', steps: [],
      })

      // Sync store directly from HTTP right now
      const { syncStoreNow } = await import('@/lib/storeSync')
      await syncStoreNow(true, 'demo')

      setStep('success')

    } catch (e: any) {
      clearInterval(timer)
      setProgress(0)
      setError('Connection error: ' + (e.message || 'unknown'))
      setStep('select')
    }
  }

  if (step === 'select') return (
    <div className="space-y-5">
      <div>
        <p className="label-caps mb-1">Step 1 of 4</p>
        <h3 className="text-base font-medium text-white">Select your broker</h3>
        <p className="text-xs text-gray-600 mt-1">
          MarqBridge mirrors your broker's exact data. Zero discrepancies.
        </p>
      </div>

      <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">
            Explore without a broker
          </p>
          <p className="text-2xs text-gray-600 mt-0.5">
            Live-simulated data — full platform access
          </p>
        </div>
        <button onClick={handleDemo}
          className="px-4 py-2 rounded-lg border border-brand-gold/40
                     text-brand-gold text-xs font-medium bg-brand-gold/10
                     hover:bg-brand-gold/20 transition-colors whitespace-nowrap">
          Try demo →
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {REGIONS.map(r => (
          <button key={r} onClick={() => setRegion(r)}
            className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
              region === r
                ? 'border-brand-gold/50 text-brand-gold bg-brand-gold/8'
                : 'border-terminal-border text-gray-600 hover:text-gray-400'
            }`}>
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(broker => (
          <button key={broker.id}
            onClick={() => { setSelected(broker); setStep('guide') }}
            className="flex items-center gap-3 p-4 rounded-xl border border-terminal-border bg-terminal-elevated hover:border-brand-gold/30 hover:bg-brand-gold/3 transition-all text-left group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                 style={{ background: broker.color + '20', color: broker.color, border: `1px solid ${broker.color}30` }}>
              {broker.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white group-hover:text-brand-gold transition-colors truncate">{broker.name}</p>
              <p className="text-2xs text-gray-600 truncate">{broker.type}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {broker.region.slice(0, 2).map(r => (
                  <span key={r} className="text-2xs px-1.5 py-0.5 rounded bg-terminal-muted text-gray-600">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  if (step === 'guide' && selected) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('select')}
          className="text-gray-600 hover:text-gray-400 transition-colors text-xs">
          ← Back
        </button>
        <div>
          <p className="label-caps mb-0.5">Step 2 of 4</p>
          <h3 className="text-base font-medium text-white">
            How to get your {selected.name} API key
          </h3>
        </div>
      </div>

      <div className="space-y-3">
        {selected.steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border border-brand-gold/30 bg-brand-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-2xs font-mono text-brand-gold">{i + 1}</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed pt-0.5">{s}</p>
          </div>
        ))}
      </div>

      <div className="bg-terminal-elevated border border-terminal-border rounded-xl p-4 space-y-2">
        <p className="text-2xs text-gray-600 font-medium">Security reminder</p>
        <div className="space-y-1.5">
          {[
            'Enable Read Only permissions only',
            'Never enable withdrawal permissions',
            'MarqBridge never stores keys on external servers',
            'Your keys stay in your local environment only',
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-2xs text-gray-500">
              <span className="w-1 h-1 rounded-full bg-risk-safe flex-shrink-0" />
              {t}
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setStep('credentials')}
        className="w-full py-2.5 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-colors active:scale-[0.98]">
        I have my API key → Continue
      </button>
    </div>
  )

  if (step === 'credentials' && selected) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('guide')}
          className="text-gray-600 hover:text-gray-400 transition-colors text-xs">
          ← Back
        </button>
        <div>
          <p className="label-caps mb-0.5">Step 3 of 4</p>
          <h3 className="text-base font-medium text-white">
            Paste your {selected.name} credentials
          </h3>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label-caps block mb-1.5">API Key</label>
          <input type="password" value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Paste your API key here"
            autoComplete="off"
            className="w-full bg-terminal-elevated border border-terminal-border rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:border-brand-gold/50 transition-colors" />
        </div>
        <div>
          <label className="label-caps block mb-1.5">API Secret</label>
          <input type="password" value={apiSecret}
            onChange={e => setApiSecret(e.target.value)}
            placeholder="Paste your API secret here"
            autoComplete="off"
            className="w-full bg-terminal-elevated border border-terminal-border rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:border-brand-gold/50 transition-colors" />
        </div>
        {selected.id === 'okx' && (
          <div>
            <label className="label-caps block mb-1.5">Passphrase</label>
            <input type="password" value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder="Your OKX passphrase"
              autoComplete="off"
              className="w-full bg-terminal-elevated border border-terminal-border rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:border-brand-gold/50 transition-colors" />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-risk-danger/8 border border-risk-danger/25 rounded-xl px-4 py-3">
          <p className="text-xs text-risk-danger leading-relaxed">{error}</p>
        </div>
      )}

      <p className="text-2xs text-gray-700 leading-relaxed">
        Keys are encrypted in your local environment and never sent to
        any third-party server. MarqBridge only reads data — never trades.
      </p>

      <button onClick={handleConnect}
        disabled={!apiKey.trim() || !apiSecret.trim()}
        className="w-full py-3 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
        Connect {selected.name} — Read Only
      </button>
    </div>
  )

  if (step === 'connecting' && selected) return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <p className="label-caps">Step 4 of 4</p>
        <h3 className="text-base font-medium text-white">
          Connecting to {selected.name}
        </h3>
      </div>

      <div className="space-y-2">
        <div className="h-1.5 bg-terminal-elevated rounded-full overflow-hidden">
          <div className="h-full bg-brand-gold rounded-full transition-all duration-300"
               style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-2xs text-gray-700">
          <span>Validating credentials</span>
          <span>{progress}%</span>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Authenticating API key',         done: progress >= 30 },
          { label: 'Fetching account state',          done: progress >= 60 },
          { label: 'Loading open positions',          done: progress >= 80 },
          { label: 'Activating risk monitoring',      done: progress >= 95 },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-xs">
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
              item.done
                ? 'border-risk-safe bg-risk-safe/15'
                : 'border-terminal-border'
            }`}>
              {item.done && (
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <path d="M1.5 4L10 5.5L6.5 2" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              )}
            </div>
            <span className={item.done ? 'text-gray-400' : 'text-gray-700'}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (step === 'success' && selected) return (
    <div className="space-y-5 py-2">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-risk-safe/15 border border-risk-safe/30 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M5 12L10 17L19 7" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-medium text-white">
            {selected.name} connected
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Live data is now streaming into MarqBridge
          </p>
        </div>
      </div>

      <div className="bg-terminal-elevated border border-terminal-border rounded-xl p-4 space-y-2">
        {[
          ['Broker',      selected.name],
          ['Mode',        'Read-only (no trading access)'],
          ['Data source', 'Direct broker feed'],
          ['Status',      'Live'],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between text-xs py-1 border-b border-terminal-border/40 last:border-0">
            <span className="text-gray-600">{l}</span>
            <span className={`font-mono ${v === 'Live' ? 'text-risk-safe' : 'text-gray-300'}`}>{v}</span>
          </div>
        ))}
      </div>

      <button onClick={onComplete}
        className="w-full py-3 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-all active:scale-[0.98]">
        Go to dashboard →
      </button>
    </div>
  )

  return null
}
