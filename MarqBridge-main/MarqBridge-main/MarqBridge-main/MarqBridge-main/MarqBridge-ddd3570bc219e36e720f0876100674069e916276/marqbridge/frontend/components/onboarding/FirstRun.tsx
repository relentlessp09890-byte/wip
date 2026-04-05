'use client'
import { useState } from 'react'
import Logo from '@/components/ui/Logo'
import { setFlag } from '@/lib/flags'

const MARKET_TYPES = [
  { id: 'crypto', label: 'Crypto', desc: 'BTC, ETH, altcoins via CEX', icon: '₿' },
  { id: 'forex', label: 'Forex', desc: 'Currency pairs & precious metals', icon: '$' },
  { id: 'india', label: 'Indian markets', desc: 'NSE, BSE, F&O', icon: '₹' },
  { id: 'equity', label: 'Global equities', desc: 'US stocks, ETFs, options', icon: 'E' },
]

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Learning', desc: '< 1 year trading' },
  { id: 'intermediate', label: 'Active', desc: '1–3 years' },
  { id: 'professional', label: 'Professional', desc: '3+ years / prop desk' },
]

type FRStep = 'welcome' | 'market' | 'experience' | 'ready'

export default function FirstRun({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<FRStep>('welcome')
  const [markets, setMarkets] = useState<string[]>(['crypto'])
  const [experience, setExperience] = useState('professional')

  function toggleMarket(id: string) {
    setMarkets(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  function finish() {
    setFlag('marq_onboarded')
    localStorage.setItem('marq_markets', JSON.stringify(markets))
    localStorage.setItem('marq_experience', experience)
    onComplete()
  }

  if (step === 'welcome') return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-3">
          <div className="flex items-center justify-center mb-6">
            <Logo size="md" />
          </div>
          <h1 className="text-2xl font-medium text-white leading-tight">
            Risk-first trading.<br/>Do less. Do it right.
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            MarqBridge mirrors your broker's exact data and evaluates
            every trade before you take it. Not a prediction engine.
            A risk guard.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Broker-mirrored', desc: 'Exact pricing, zero discrepancy' },
            { label: 'Pre-trade gate', desc: 'Risk evaluated before entry' },
            { label: 'Decision journal', desc: 'Every trade logged in context' },
          ].map(item => (
            <div key={item.label} className="bg-terminal-elevated border border-terminal-border rounded-xl p-3 text-left">
              <p className="text-xs font-medium text-white mb-1">{item.label}</p>
              <p className="text-2xs text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setStep('market')} className="w-full py-3 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-all active:scale-[0.98]">
          Get started →
        </button>
      </div>
    </div>
  )

  if (step === 'market') return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div>
          <p className="label-caps mb-1">Setup 1 of 2</p>
          <h2 className="text-lg font-medium text-white">What markets do you trade?</h2>
          <p className="text-xs text-gray-600 mt-1">Select all that apply — affects risk thresholds and data formatting.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MARKET_TYPES.map(m => (
            <button key={m.id} onClick={() => toggleMarket(m.id)} className={`p-4 rounded-xl border text-left transition-all ${markets.includes(m.id) ? 'border-brand-gold/40 bg-brand-gold/8' : 'border-terminal-border bg-terminal-elevated hover:border-terminal-muted'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-mono font-bold ${markets.includes(m.id) ? 'text-brand-gold' : 'text-gray-600'}`}>{m.icon}</span>
                <span className={`text-sm font-medium ${markets.includes(m.id) ? 'text-white' : 'text-gray-400'}`}>{m.label}</span>
              </div>
              <p className="text-2xs text-gray-600">{m.desc}</p>
            </button>
          ))}
        </div>
        <button onClick={() => setStep('experience')} disabled={markets.length === 0} className="w-full py-3 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">Continue →</button>
      </div>
    </div>
  )

  if (step === 'experience') return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div>
          <p className="label-caps mb-1">Setup 2 of 2</p>
          <h2 className="text-lg font-medium text-white">Your experience level</h2>
          <p className="text-xs text-gray-600 mt-1">Used to calibrate risk gate thresholds and alerts.</p>
        </div>
        <div className="space-y-3">
          {EXPERIENCE_LEVELS.map(e => (
            <button key={e.id} onClick={() => setExperience(e.id)} className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${experience === e.id ? 'border-brand-gold/40 bg-brand-gold/8' : 'border-terminal-border bg-terminal-elevated hover:border-terminal-muted'}`}>
              <div>
                <p className={`text-sm font-medium ${experience === e.id ? 'text-white' : 'text-gray-400'}`}>{e.label}</p>
                <p className="text-2xs text-gray-600 mt-0.5">{e.desc}</p>
              </div>
              {experience === e.id && (
                <div className="w-5 h-5 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-brand-gold" />
                </div>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setStep('ready')} className="w-full py-3 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-all active:scale-[0.98]">Almost there →</button>
      </div>
    </div>
  )

  if (step === 'ready') return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 8V14C25 19.5 20 24.3 14 26C8 24.3 3 19.5 3 14V8L14 3Z" stroke="#e0b84a" strokeWidth="1.5" fill="none" />
              <path d="M9 14L12.5 17.5L19 11" stroke="#e0b84a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-white">MarqBridge is ready</h2>
          <p className="text-sm text-gray-500 leading-relaxed">Connect your broker to activate live risk monitoring, the tactical simulator, and AI intelligence.</p>
        </div>
        <div className="space-y-2 text-left">
          {['Broker-mirrored pricing — zero discrepancy', 'Pre-trade risk gate evaluation', 'Real-time margin & liquidation monitoring', 'AI news filter — position-aware only', 'Circuit breaker — protects against emotional trading'].map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-gray-400">
              <span className="w-1 h-1 rounded-full bg-brand-gold flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
        <button onClick={finish} className="w-full py-3 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-medium bg-brand-gold/8 hover:bg-brand-gold/15 transition-all active:scale-[0.98]">Connect my broker →</button>
      </div>
    </div>
  )

  return null
}
