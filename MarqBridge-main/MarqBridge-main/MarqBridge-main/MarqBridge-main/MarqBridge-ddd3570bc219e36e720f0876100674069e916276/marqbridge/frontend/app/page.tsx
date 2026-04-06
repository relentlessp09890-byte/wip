'use client'
import { useState, useEffect } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import StatePanel from '@/components/panels/StatePanel'
import { ExposurePanel } from '@/components/panels/ExposurePanel'
import DecisionsPanel from '@/components/panels/DecisionsPanel'
import LogPanel from '@/components/panels/LogPanel'
import NewsPanel from '@/components/panels/NewsPanel'
import IntegrationsPanel from '@/components/panels/IntegrationsPanel'
import FirstRun from '@/components/onboarding/FirstRun'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { getFlag, setFlag } from '@/lib/flags'
import { validateTierServer } from '@/lib/tierGate'
import dynamic from 'next/dynamic'

const PANEL_MAP: Record<string, React.ReactNode> = {
  STATE:        <ErrorBoundary name="State"><StatePanel /></ErrorBoundary>,
  POSITIONS:    <ErrorBoundary name="Positions"><ExposurePanel /></ErrorBoundary>,
  DECISIONS:    <ErrorBoundary name="Decisions"><DecisionsPanel /></ErrorBoundary>,
  LOG:          <ErrorBoundary name="Log"><LogPanel /></ErrorBoundary>,
  NEWS:         <ErrorBoundary name="News"><NewsPanel /></ErrorBoundary>,
  INTEGRATIONS: <ErrorBoundary name="Integrations"><IntegrationsPanel /></ErrorBoundary>,
}

export default function Home() {
  const { activeTab, setActiveTab } = useMarqStore()
  const [ready, setReady]           = useState(false)
  const [onboarded, setOnboarded]   = useState(false)

  useEffect(() => {
    // Mark landing as seen (user reached the app)
    setFlag('marq_saw_landing')
    const v = getFlag('marq_onboarded')
    setOnboarded(v === '1')
    setReady(true)
    validateTierServer().then(tier => {
      localStorage.setItem('marq_tier', tier)
    })
  }, [])

  if (!ready) return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(224,184,74,0.12)',
        border: '1px solid rgba(224,184,74,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        <span style={{ color: '#e0b84a', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>M</span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )

  if (!onboarded) return (
    <FirstRun onComplete={() => {
      setFlag('marq_onboarded')
      setActiveTab('INTEGRATIONS')
      setOnboarded(true)
    }} />
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden', background: '#0a0a0a',
    }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {PANEL_MAP[activeTab] ?? PANEL_MAP['STATE']}
        </main>
      </div>
    </div>
  )
}
