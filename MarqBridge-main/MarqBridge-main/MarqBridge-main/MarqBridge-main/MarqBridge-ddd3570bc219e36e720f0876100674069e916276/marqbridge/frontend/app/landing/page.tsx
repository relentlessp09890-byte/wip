'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Logo from '@/components/ui/Logo'
import { setFlag } from '@/lib/flags'
import styles from './landing.module.css'

const NAV_LINKS = [
  { label: 'Why MarqBridge', href: '#why' },
  { label: 'Features',       href: '#features' },
  { label: 'Pricing',        href: '#pricing' },
  { label: 'FAQ',            href: '#faq' },
]

const STATS = [
  { value: '< 2s',  label: 'Gate evaluation time' },
  { value: '8',     label: 'Supported brokers' },
  { value: '4',     label: 'Liquidation alert tiers' },
  { value: '100%',  label: 'Broker-mirrored pricing' },
  { value: '3',     label: 'Markets: Crypto, Forex, India' },
]

const PROBLEMS = [
  {
    pain:    'You enter a position and realize 10 minutes later it was twice the right size.',
    solve:   'The Tactical Simulator evaluates your margin impact, liquidation distance, and risk score delta before you touch the button. Gate approved or blocked — in under 2 seconds.',
    feature: 'Pre-trade risk gate',
    tag:     'Core',
    tagColor:'#e0b84a',
    ui: {
      label: 'Gate verdict',
      status: 'BLOCKED',
      statusColor: '#f87171',
      lines: [
        { k: 'Margin impact',     v: '68% of equity', c: '#f87171' },
        { k: 'Projected margin',  v: '112%',           c: '#f87171' },
        { k: 'Risk score',        v: '28 → 74',        c: '#f87171' },
      ],
      reason: 'Single trade exceeds 50% of available equity.',
    },
  },
  {
    pain:    'After three losses in a row, you keep trading. You know you should stop. You can\'t.',
    solve:   'The Circuit Breaker monitors your session automatically. Three consecutive losses, daily loss limit hit, or two gate overrides — and new entry is locked. No willpower required.',
    feature: 'Revenge trading circuit breaker',
    tag:     'Behavioral',
    tagColor:'#60a5fa',
    ui: {
      label: 'Circuit breaker',
      status: 'LOCKED',
      statusColor: '#f87171',
      lines: [
        { k: 'Trigger',    v: '3 consecutive losses', c: '#f87171' },
        { k: 'Session PnL',v: '-$847',                c: '#f87171' },
        { k: 'Override',   v: 'OVERRIDE-MARQ required',c: '#888' },
      ],
      reason: 'Session locked to protect capital.',
    },
  },
  {
    pain:    'A major news event moves your open position and you find out an hour later.',
    solve:   'AI News Filter scores every incoming article 1–10 for impact on your specific open positions. Score below 7? Suppressed. You only see what actually matters to your trades.',
    feature: 'AI news intelligence',
    tag:     'Pro',
    tagColor:'#a78bfa',
    ui: {
      label: 'News intelligence',
      status: '9 / 10',
      statusColor: '#f87171',
      lines: [
        { k: 'Headline',    v: 'Fed rate decision — markets surge', c: '#e8e8e8' },
        { k: 'Your positions', v: 'BTCUSDT · XAUUSD affected',     c: '#f87171' },
        { k: 'Suppressed',  v: '14 low-impact articles hidden',    c: '#444' },
      ],
      reason: null,
    },
  },
  {
    pain:    'You have no idea why you keep losing. The pattern is invisible to you.',
    solve:   'Every trade is logged with full context: margin state, risk score, emotional tag, gate status. After 20 trades, MarqBridge shows you your loss patterns — the ones you can\'t see yourself.',
    feature: 'Decision journal + pattern detection',
    tag:     'Pro',
    tagColor:'#a78bfa',
    ui: {
      label: 'Discipline score',
      status: 'C — 58%',
      statusColor: '#e0b84a',
      lines: [
        { k: 'Pattern found', v: 'Losses spike after 2 wins', c: '#e0b84a' },
        { k: 'FOMO trades',   v: '6 of 18 — all negative',   c: '#f87171' },
        { k: 'Gate overrides',v: '4 this week',               c: '#f87171' },
      ],
      reason: 'Review entry criteria for impulsive setups.',
    },
  },
]

const FEATURES = [
  { name: 'Risk gate',            desc: 'Evaluates margin impact before every entry. Approves, warns, or blocks.',   tag: 'Free',   icon: 'gate' },
  { name: 'Circuit breaker',      desc: 'Auto-locks new entries on consecutive losses or gate overrides.',           tag: 'Free',   icon: 'lock' },
  { name: 'Liquidation radar',    desc: '4-tier proximity alerts with audio escalation. Full-screen at 2%.',         tag: 'Free',   icon: 'radar' },
  { name: 'Margin stress test',   desc: 'Simulate a -5% to -50% price shock across all open positions.',            tag: 'Free',   icon: 'stress' },
  { name: 'Session heat score',   desc: 'Real-time psychological state monitor. Rises with impulsive patterns.',    tag: 'Free',   icon: 'heat' },
  { name: 'AI news filter',       desc: 'Position-aware news scoring. Only surfaces articles that affect your trades.',tag: 'Pro', icon: 'news' },
  { name: 'Decision journal',     desc: 'Every trade logged with risk context, emotional tag, and gate status.',     tag: 'Pro',   icon: 'journal' },
  { name: 'Discipline scoring',   desc: 'Weekly grade based on gate compliance. Trend over 4/12/52 weeks.',         tag: 'Pro',   icon: 'score' },
  { name: 'Loss pattern detector',desc: 'Surfaces recurring loss conditions after 20+ trades.',                     tag: 'Pro',   icon: 'pattern' },
  { name: 'Performance export',   desc: 'CSV trade history + performance report with profit factor and win rate.',  tag: 'Pro',   icon: 'export' },
  { name: 'Market regime AI',     desc: 'Classifies trending/ranging/volatile/illiquid. Auto-adjusts thresholds.',  tag: 'Pro',   icon: 'regime' },
  { name: 'Prop desk mode',       desc: 'Team accounts, shared circuit breaker rules, compliance export.',          tag: 'Prop',  icon: 'team' },
]

const FAQS = [
  {
    q: 'Can MarqBridge place trades on my behalf?',
    a: 'No — and this is by design. MarqBridge only uses read-only API keys. It can never place, modify, or cancel orders. This is enforced at the API key permission level, not just our software.',
  },
  {
    q: 'Is my data sent to any server?',
    a: 'No. MarqBridge runs entirely within your own environment — your Codespace, your VPS, or your machine. Your API keys and trade data never leave your instance. There is no MarqBridge cloud that stores your data.',
  },
  {
    q: 'Does it work for Indian market traders (Zerodha, Angel One)?',
    a: 'Yes. MarqBridge supports Zerodha via KiteConnect and Angel One via SmartAPI. Both NSE and BSE equities, F&O, and indices are supported with INR-denominated formatting and IST session awareness.',
  },
  {
    q: 'What happens if my broker API goes down?',
    a: 'MarqBridge shows the last known data with a stale indicator and automatically attempts reconnection with exponential backoff. Your decision journal and historical data are never affected.',
  },
  {
    q: 'How is the Pre-trade Gate different from a position sizer?',
    a: 'Position sizers tell you how much to buy. The risk gate tells you whether you should buy at all — given your current margin level, open positions, correlation with existing exposure, and your session heat score. It\'s a decision filter, not a calculator.',
  },
  {
    q: 'Can I try it without connecting my broker?',
    a: 'Yes. Demo mode loads a live-simulated account with realistic positions, prices that move in real time, and pre-loaded journal history. Full platform access — no API key needed.',
  },
]

const TIERS = [
  {
    name:    'Core',
    price:   'Free',
    period:  'forever',
    desc:    'Full risk protection for individual traders.',
    accent:  false,
    cta:     'Start free — no signup',
    ctaAction: 'demo',
    features: [
      'Connect 1 broker (Binance, Bybit, OKX, Zerodha, OANDA + more)',
      'Pre-trade risk gate with go/no-go verdict',
      'Margin stress test simulator',
      'Liquidation radar — 4-tier audio alerts',
      'Session heat score + circuit breaker',
      '30-day decision journal',
      'Real-time margin + position monitoring',
    ],
  },
  {
    name:    'Pro',
    price:   '$29',
    period:  '/month',
    desc:    'Behavioral intelligence for serious traders.',
    accent:  true,
    cta:     'Start Pro',
    ctaAction: 'pro',
    features: [
      'Everything in Core',
      'Unlimited journal history',
      'Discipline score + weekly trends',
      'Loss pattern detection (after 20 trades)',
      'AI news filter — position-aware scoring',
      'Market regime classifier',
      'Performance report + CSV export',
      'Priority support',
    ],
  },
  {
    name:    'Prop Desk',
    price:   '$99',
    period:  '/month',
    desc:    'Team risk management for prop firms.',
    accent:  false,
    cta:     'Contact us',
    ctaAction: 'contact',
    features: [
      'Everything in Pro',
      'Up to 10 trader accounts',
      'Shared circuit breaker rules',
      'Team risk dashboard',
      'Compliance export (JSON/PDF)',
      'Risk rule enforcement across accounts',
      'Custom onboarding',
    ],
  },
]

function UIMockup({ data }: { data: typeof PROBLEMS[0]['ui'] }) {
  return (
    <div style={{
      background: '#0f0f0f',
      border: '0.5px solid #1e1e1e',
      borderRadius: 12,
      padding: '14px 16px',
      fontFamily: 'monospace',
      minWidth: 260,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, letterSpacing: '.08em', color: '#444', textTransform: 'uppercase' }}>
          {data.label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: data.statusColor }}>
          {data.status}
        </span>
      </div>
      {data.lines.map((l, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', padding: '4px 0',
                              borderBottom: '0.5px solid #141414', fontSize: 11 }}>
          <span style={{ color: '#555' }}>{l.k}</span>
          <span style={{ color: l.c }}>{l.v}</span>
        </div>
      ))}
      {data.reason && (
        <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(248,113,113,0.07)',
                      border: '0.5px solid rgba(248,113,113,0.2)', borderRadius: 7,
                      fontSize: 11, color: '#f87171', lineHeight: 1.5 }}>
          {data.reason}
        </div>
      )}
    </div>
  )
}

function FeatureIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    gate:    <path d="M12 3L21 7.5V12C21 16.5 17 20.5 12 22C7 20.5 3 16.5 3 12V7.5L12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>,
    lock:    <><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    radar:   <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1" fill="none" opacity=".5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></>,
    stress:  <><path d="M3 18L8 13L12 16L17 10L21 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M17 10L21 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".5"/></>,
    heat:    <path d="M12 2C12 2 5 8 5 13C5 16.9 8.1 20 12 20C15.9 20 19 16.9 19 13C19 8 12 2 12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>,
    news:    <><rect x="3" y="3" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="3" y="10" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="3" y="15" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
    journal: <><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 7H16M8 11H16M8 15H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    score:   <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    pattern: <><circle cx="5" cy="18" r="2" fill="currentColor"/><circle cx="12" cy="8" r="2" fill="currentColor"/><circle cx="19" cy="14" r="2" fill="currentColor"/><path d="M5 16L12 10L19 12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" fill="none"/></>,
    export:  <><path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M3 17V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    regime:  <><path d="M3 12C3 8 6 4 12 4C18 4 21 8 21 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M8 17C8 14.8 9.8 13 12 13C14.2 13 16 14.8 16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    team:    <><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="15" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M3 19C3 16.2 5.7 14 9 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M15 14C18.3 14 21 16.2 21 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         style={{ color: '#e0b84a', flexShrink: 0 }}>
      {icons[type]}
    </svg>
  )
}

export default function LandingPage() {
  const router   = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq]   = useState<number | null>(null)
  const [annual, setAnnual]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
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
    }
  }

  function goToApp(mode: 'demo' | 'connect' | 'pro' | 'contact') {
    setFlag('marq_saw_landing')
    if (mode === 'demo') {
      setFlag('marq_onboarded')
      router.push('/?demo=1')
    } else if (mode === 'pro') {
      setFlag('marq_onboarded')
      router.push('/?upgrade=pro')
    } else if (mode === 'contact') {
      window.location.href = 'mailto:hello@marqbridge.io?subject=Prop Desk inquiry'
    } else {
      router.push('/')
    }
  }

  const proPrice  = annual ? '$23' : '$29'
  const propPrice = annual ? '$79' : '$99'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#e8e8e8',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 14,
      lineHeight: 1.6,
    }}>

      {/* ── Sticky nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '0.5px solid #1a1a1a' : '0.5px solid transparent',
        transition: 'all 0.2s',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          height: 60, display: 'flex', alignItems: 'center', gap: 32,
        }}>
          <Logo size="sm" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} style={{
                fontSize: 13, color: '#666',
                textDecoration: 'none', transition: 'color .15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#aaa')}
              onMouseOut={e  => (e.currentTarget.style.color = '#666')}>
                {l.label}
              </a>
            ))}
          </div>

          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {menuOpen ? (
                <path d="M4 4L16 16M16 4L4 16"
                  stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
              ) : (
                <>
                  <line x1="3" y1="6"  x2="17" y2="6"
                    stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="17" y2="10"
                    stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="14" x2="17" y2="14"
                    stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
                </>
              )}
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => {
              setFlag('marq_saw_landing')
              router.push('/auth?redirect=/')
            }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#666', padding: '8px 12px',
              transition: 'color .15s',
            }}
            onMouseOver={e => (e.currentTarget.style.color = '#aaa')}
            onMouseOut={e  => (e.currentTarget.style.color = '#666')}>
              Sign in
            </button>
            <button onClick={() => goToApp('demo')} style={{
              padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
              border: '0.5px solid rgba(224,184,74,0.4)',
              background: 'rgba(224,184,74,0.08)',
              color: '#e0b84a', fontSize: 13, fontWeight: 500,
              transition: 'background .15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(224,184,74,0.15)')}
            onMouseOut={e  => (e.currentTarget.style.background = 'rgba(224,184,74,0.08)')}>
              Try demo free
            </button>
            {installPrompt && (
              <button onClick={installApp} style={{
                padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                border: '0.5px solid rgba(224,184,74,0.4)',
                background: 'none',
                color: '#e0b84a', fontSize: 13, fontWeight: 500,
                transition: 'background .15s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(224,184,74,0.08)')}
              onMouseOut={e  => (e.currentTarget.style.background = 'none')}>
                Install app
              </button>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className={styles.mobileDrawer}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href}
              className={styles.mobileDrawerLink}
              onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className={styles.mobileDrawerActions}>
            <button
              className={`${styles.mobileDrawerBtn} ${styles.mobileDrawerBtnSecondary}`}
              onClick={() => { setMenuOpen(false); goToApp('connect') }}>
              Sign in
            </button>
            <button
              className={`${styles.mobileDrawerBtn} ${styles.mobileDrawerBtnPrimary}`}
              onClick={() => { setMenuOpen(false); goToApp('demo') }}>
              Try demo
            </button>
            {installPrompt && (
              <button
                className={`${styles.mobileDrawerBtn} ${styles.mobileDrawerBtnSecondary}`}
                onClick={() => { setMenuOpen(false); installApp() }}>
                Install app
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{
        maxWidth: 1080, margin: '0 auto', padding: '96px 24px 80px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        gap: 64, alignItems: 'center',
      }}>
        <div>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20, marginBottom: 24,
            border: '0.5px solid rgba(224,184,74,0.2)',
            background: 'rgba(224,184,74,0.06)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#e0b84a', animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11, color: '#e0b84a', letterSpacing: '.04em' }}>
              Risk-first OS · Crypto · Forex · Indian markets
            </span>
          </div>

          <h1 style={{
            fontSize: 52, fontWeight: 600, lineHeight: 1.1,
            letterSpacing: '-0.02em', margin: '0 0 20px',
            color: '#ffffff',
          }}>
            Stop trading.<br />
            <span style={{ color: '#e0b84a' }}>Start deciding.</span>
          </h1>

          <p style={{
            fontSize: 17, color: '#888', lineHeight: 1.7,
            margin: '0 0 36px', maxWidth: 420,
          }}>
            MarqBridge evaluates every trade before you take it.
            Pre-trade risk gate, circuit breaker, liquidation alerts,
            and a decision journal that shows you the patterns you
            can't see yourself.
          </p>

          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20,
          }} className={styles.heroCtas}>
            <button onClick={() => goToApp('demo')} style={{
              padding: '13px 28px', borderRadius: 10, cursor: 'pointer',
              border: '0.5px solid rgba(224,184,74,0.4)',
              background: 'rgba(224,184,74,0.1)',
              color: '#e0b84a', fontSize: 14, fontWeight: 500,
              transition: 'background .15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(224,184,74,0.18)')}
            onMouseOut={e  => (e.currentTarget.style.background = 'rgba(224,184,74,0.1)')}>
              Try demo free — no signup →
            </button>
            <button onClick={() => goToApp('connect')} style={{
              padding: '13px 24px', borderRadius: 10, cursor: 'pointer',
              border: '0.5px solid #1e1e1e',
              background: 'none',
              color: '#666', fontSize: 14,
              transition: 'all .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#2e2e2e'; e.currentTarget.style.color = '#aaa' }}
            onMouseOut={e  => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#666' }}>
              Connect my broker
            </button>
          </div>

          <p style={{ fontSize: 11, color: '#333', lineHeight: 1.7 }}>
            Read-only API only · Never places trades · Your data stays local
          </p>
        </div>

        {/* Hero product mockup */}
        <div style={{
          background: '#0f0f0f', border: '0.5px solid #1e1e1e',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {/* Mock terminal header */}
          <div style={{
            padding: '10px 16px', borderBottom: '0.5px solid #1a1a1a',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['#f87171','#e0b84a','#4ade80'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: .6 }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: '#333', marginLeft: 4 }}>MarqBridge — risk gate evaluation</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
              binance live
            </span>
          </div>

          {/* Gate result display */}
          <div style={{ padding: 20 }}>
            {/* Top metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { l: 'Equity',       v: '$24,582', c: '#fff' },
                { l: 'Margin level', v: '187%',    c: '#4ade80' },
                { l: 'Risk score',   v: '34 / 100', c: '#e0b84a' },
              ].map(m => (
                <div key={m.l} style={{
                  background: '#141414', borderRadius: 8,
                  padding: '10px 12px',
                  border: '0.5px solid #1e1e1e',
                }}>
                  <div style={{ fontSize: 9, letterSpacing: '.07em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>
                    {m.l}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: m.c, fontFamily: 'monospace' }}>
                    {m.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Gate panel */}
            <div style={{
              border: '0.5px solid rgba(74,222,128,0.25)',
              background: 'rgba(74,222,128,0.04)',
              borderRadius: 10, padding: 14, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 9, letterSpacing: '.07em', color: '#444', textTransform: 'uppercase' }}>Gate verdict</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
                  Gate clear
                </span>
              </div>
              {[
                { k: 'Margin required',   v: '$670',    c: '#e8e8e8' },
                { k: 'Margin impact',     v: '2.7% of equity', c: '#4ade80' },
                { k: 'Margin after',      v: '183.4%',  c: '#4ade80' },
                { k: 'Est. liquidation',  v: '$60,480', c: '#888' },
                { k: 'Risk score change', v: '34 → 37 (+3)', c: '#e0b84a' },
              ].map(r => (
                <div key={r.k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '3px 0', borderBottom: '0.5px solid #141414',
                  fontSize: 11,
                }}>
                  <span style={{ color: '#555' }}>{r.k}</span>
                  <span style={{ color: r.c, fontFamily: 'monospace' }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Positions */}
            <div style={{ background: '#141414', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #1e1e1e' }}>
              <div style={{ fontSize: 9, letterSpacing: '.07em', color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>
                Open positions
              </div>
              {[
                { t: 'BTCUSDT', s: 'LONG',  p: '+$182', c: '#4ade80', d: '47.2% from liq' },
                { t: 'ETHUSDT', s: 'LONG',  p: '-$43',  c: '#f87171', d: '38.6% from liq' },
                { t: 'XAUUSD',  s: 'SHORT', p: '+$91',  c: '#4ade80', d: '52.1% from liq' },
              ].map(p => (
                <div key={p.t} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 0', borderBottom: '0.5px solid #1a1a1a', fontSize: 11,
                }}>
                  <span style={{
                    fontSize: 9, padding: '2px 5px', borderRadius: 3,
                    background: p.s === 'LONG' ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)',
                    color: p.s === 'LONG' ? '#4ade80' : '#f87171',
                    fontFamily: 'monospace',
                  }}>{p.s}</span>
                  <span style={{ color: '#e8e8e8', fontFamily: 'monospace', flex: 1 }}>{p.t}</span>
                  <span style={{ color: p.c, fontFamily: 'monospace' }}>{p.p}</span>
                  <span style={{ color: '#333', fontSize: 10 }}>{p.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.mobileTicker}>
          <div className={styles.mobileTickerRow}>
            <span className={styles.mobileTickerLabel}>
              Pre-trade gate
            </span>
            <span className={styles.mobileTickerBadge} style={{
              color: '#4ade80',
              background: 'rgba(74,222,128,0.1)',
              border: '0.5px solid rgba(74,222,128,0.2)',
            }}>
              APPROVED
            </span>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ borderTop: '0.5px solid #141414', borderBottom: '0.5px solid #141414' }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto', padding: '28px 24px',
          display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24,
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#e0b84a', fontFamily: 'monospace', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why MarqBridge — problem/solution ── */}
      <section id="why" style={{ maxWidth: 1080, margin: '0 auto', padding: '100px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: '.1em', color: '#444', textTransform: 'uppercase', marginBottom: 12 }}>
            Why MarqBridge exists
          </div>
          <h2 style={{ fontSize: 38, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0 }}>
            Every feature was built because<br />a real trader lost money without it.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {PROBLEMS.map((p, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: i % 2 === 0 ? '1fr 340px' : '340px 1fr',
              gap: 48, alignItems: 'center',
            }}>
              {i % 2 !== 0 && <div className={styles.problemMockup}><UIMockup data={p.ui} /></div>}
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 10, marginBottom: 16,
                  border: `0.5px solid ${p.tagColor}30`,
                  background: `${p.tagColor}10`,
                }}>
                  <span style={{ fontSize: 10, color: p.tagColor, fontWeight: 500 }}>
                    {p.feature}
                  </span>
                  <span style={{ fontSize: 10, color: p.tagColor, opacity: .5 }}>· {p.tag}</span>
                </div>
                <p style={{
                  fontSize: 15, color: '#555', lineHeight: 1.7, marginBottom: 16,
                  fontStyle: 'italic',
                  padding: '0 0 0 12px',
                  borderLeft: '2px solid #1e1e1e',
                }}>
                  "{p.pain}"
                </p>
                <p style={{ fontSize: 15, color: '#aaa', lineHeight: 1.7, margin: 0 }}>
                  {p.solve}
                </p>
              </div>
              {i % 2 === 0 && <div className={styles.problemMockup}><UIMockup data={p.ui} /></div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" style={{
        background: '#080808', borderTop: '0.5px solid #141414',
        borderBottom: '0.5px solid #141414',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, letterSpacing: '.1em', color: '#444', textTransform: 'uppercase', marginBottom: 12 }}>
              Platform capabilities
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Built for the discipline side of trading.
            </h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 10,
          }}>
            {FEATURES.map(f => (
              <div key={f.name} style={{
                background: '#0f0f0f', border: '0.5px solid #1a1a1a',
                borderRadius: 12, padding: '16px 18px',
                transition: 'border-color .15s',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              onMouseOut={e  => (e.currentTarget.style.borderColor = '#1a1a1a')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <FeatureIcon type={f.icon} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8' }}>{f.name}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, padding: '2px 7px', borderRadius: 8,
                    background: f.tag === 'Free' ? 'rgba(74,222,128,.08)' :
                                f.tag === 'Pro'  ? 'rgba(167,139,250,.08)' : 'rgba(224,184,74,.08)',
                    color:      f.tag === 'Free' ? '#4ade80' :
                                f.tag === 'Pro'  ? '#a78bfa' : '#e0b84a',
                    border: `0.5px solid ${f.tag === 'Free' ? 'rgba(74,222,128,.2)' : f.tag === 'Pro' ? 'rgba(167,139,250,.2)' : 'rgba(224,184,74,.2)'}`,
                  }}>
                    {f.tag}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ maxWidth: 1080, margin: '0 auto', padding: '100px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, letterSpacing: '.1em', color: '#444', textTransform: 'uppercase', marginBottom: 12 }}>
            Pricing
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            Start free. Scale when ready.
          </h2>
          <p style={{ fontSize: 14, color: '#555', margin: '0 0 28px' }}>
            Core risk protection is free forever. Advanced intelligence is Pro.
          </p>

          {/* Annual toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: annual ? '#555' : '#aaa' }}>Monthly</span>
            <button onClick={() => setAnnual(!annual)} style={{
              width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
              background: annual ? 'rgba(224,184,74,.2)' : '#1e1e1e',
              border: `0.5px solid ${annual ? 'rgba(224,184,74,.4)' : '#2e2e2e'}`,
              position: 'relative', transition: 'all .2s',
            }}>
              <span style={{
                position: 'absolute', top: 3, width: 16, height: 16,
                borderRadius: '50%',
                background: annual ? '#e0b84a' : '#555',
                left: annual ? 20 : 4,
                transition: 'all .2s',
              }} />
            </button>
            <span style={{ fontSize: 12, color: annual ? '#aaa' : '#555' }}>
              Annual <span style={{ color: '#4ade80', fontSize: 11 }}>save 20%</span>
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
        }}>
          {TIERS.map(t => (
            <div key={t.name} style={{
              background: '#0f0f0f',
              border: t.accent ? '1px solid rgba(224,184,74,0.3)' : '0.5px solid #1a1a1a',
              borderRadius: 16, padding: '28px 24px',
              position: 'relative',
            }}>
              {t.accent && (
                <div style={{
                  position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(224,184,74,0.15)', border: '0.5px solid rgba(224,184,74,0.35)',
                  borderRadius: 10, padding: '3px 12px',
                  fontSize: 10, color: '#e0b84a', fontWeight: 500, whiteSpace: 'nowrap',
                }}>
                  Most popular
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 38, fontWeight: 600, fontFamily: 'monospace',
                    color: t.accent ? '#e0b84a' : '#fff',
                  }}>
                    {t.name === 'Pro' ? proPrice : t.name === 'Prop Desk' ? propPrice : t.price}
                  </span>
                  {t.price !== 'Free' && (
                    <span style={{ fontSize: 13, color: '#444' }}>{t.period}</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.6 }}>{t.desc}</p>
              </div>

              <button onClick={() => goToApp(t.ctaAction as any)} style={{
                width: '100%', padding: '11px 0', borderRadius: 9, cursor: 'pointer',
                border: t.accent ? '0.5px solid rgba(224,184,74,.4)' : '0.5px solid #1e1e1e',
                background: t.accent ? 'rgba(224,184,74,.1)' : 'transparent',
                color: t.accent ? '#e0b84a' : '#666',
                fontSize: 13, fontWeight: 500, marginBottom: 20,
                transition: 'all .15s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = t.accent ? 'rgba(224,184,74,.18)' : '#141414'
                e.currentTarget.style.color      = t.accent ? '#e0b84a' : '#aaa'
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = t.accent ? 'rgba(224,184,74,.1)' : 'transparent'
                e.currentTarget.style.color      = t.accent ? '#e0b84a' : '#666'
              }}>
                {t.cta}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {t.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <span style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }}>—</span>
                    <span style={{ color: '#666', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{
        background: '#080808', borderTop: '0.5px solid #141414',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, letterSpacing: '.1em', color: '#444', textTransform: 'uppercase', marginBottom: 12 }}>
              FAQ
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Common questions
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ border: '0.5px solid #141414', borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', padding: '16px 18px', textAlign: 'left',
                  background: openFaq === i ? '#0f0f0f' : 'none',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background .15s',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#e8e8e8' }}>{f.q}</span>
                  <span style={{
                    fontSize: 18, color: '#444', transition: 'transform .2s', flexShrink: 0,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none',
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 18px 16px', fontSize: 13, color: '#666', lineHeight: 1.7 }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '100px 24px' }}>
        <div style={{
          background: '#0f0f0f',
          border: '0.5px solid rgba(224,184,74,0.15)',
          borderRadius: 24, padding: '64px 40px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 40, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.2 }}>
            The best trade is the one<br />
            <span style={{ color: '#e0b84a' }}>you don't take.</span>
          </h2>
          <p style={{ fontSize: 15, color: '#555', margin: '0 0 32px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            Start with the free demo. Full platform access.
            No account, no API key, no commitment.
          </p>
          <button onClick={() => goToApp('demo')} style={{
            padding: '14px 32px', borderRadius: 10, cursor: 'pointer',
            border: '0.5px solid rgba(224,184,74,0.4)',
            background: 'rgba(224,184,74,0.1)',
            color: '#e0b84a', fontSize: 14, fontWeight: 500,
            transition: 'background .15s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'rgba(224,184,74,0.18)')}
          onMouseOut={e  => (e.currentTarget.style.background = 'rgba(224,184,74,0.1)')}>
            Try demo free — no signup required →
          </button>
          <p style={{ fontSize: 11, color: '#2a2a2a', marginTop: 16 }}>
            Read-only API · No predictions · Data stays local · Free forever on Core
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '0.5px solid #141414', padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <Logo size="sm" />
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#333' }}>
            {['Crypto', 'Forex', 'India (NSE/BSE)', 'Global equities'].map(m => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#2a2a2a', margin: 0 }}>
            Read-only · No trading · No predictions · Data stays local
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.4 }
        }
        @media (max-width: 768px) {
          section > div[style*="grid-template-columns: minmax(0,1fr) minmax(0,1fr)"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}