'use client'
import { useMarqStore } from '@/store/useMarqStore'
import { AudioEngine, unlockAudio } from '@/lib/audioEngine'
import { hasProp } from '@/lib/tierGate'
import Logo from '@/components/ui/Logo'

const baseTabs = [
  { id: 'STATE',        label: 'State',        desc: 'Risk overview' },
  { id: 'POSITIONS',    label: 'Positions',    desc: 'Open trades' },
  { id: 'DECISIONS',    label: 'Decisions',    desc: 'Tactical gate' },
  { id: 'LOG',          label: 'Log',          desc: 'Decision ledger' },
  { id: 'NEWS',         label: 'News',         desc: 'Intelligence' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, account, positions, sidebarOpen, setSidebarOpen } = useMarqStore()
  const TABS = hasProp()
    ? [
        ...baseTabs,
        { id: 'PROP', label: 'Prop Desk', desc: 'Team risk dashboard' },
        { id: 'INTEGRATIONS', label: 'Integrations', desc: 'Brokers & AI' },
      ]
    : [
        ...baseTabs,
        { id: 'INTEGRATIONS', label: 'Integrations', desc: 'Brokers & AI' },
      ]

  const riskBg = {
    SAFE:     'bg-risk-safe/10 text-risk-safe border-risk-safe/20',
    WARNING:  'bg-risk-warning/10 text-risk-warning border-risk-warning/20',
    DANGER:   'bg-risk-danger/10 text-risk-danger border-risk-danger/20',
    CRITICAL: 'bg-risk-danger/20 text-risk-danger border-risk-danger/40',
  }[account?.riskLevel ?? 'SAFE'] ?? 'bg-risk-safe/10 text-risk-safe'

  return (
    <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-52 bg-terminal-surface border-r border-terminal-border flex flex-col flex-shrink-0 transition-transform duration-200 lg:static lg:translate-x-0 lg:w-52 lg:overflow-visible`}>
      <div className="px-5 py-5 border-b border-terminal-border">
        <Logo size="sm" />
        <p className="text-white text-sm font-medium">Command center</p>
      </div>

      {account && (
        <div className={`mx-4 mt-4 px-3 py-2 rounded-lg border text-xs font-medium ${riskBg}`}>
          <div className="label-caps mb-0.5">Risk status</div>
          <div>{account.riskLevel}</div>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              unlockAudio()
              AudioEngine.tap()
              setActiveTab(tab.id)
              setSidebarOpen(false)
            }}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-gold/10 border border-brand-gold/20 text-brand-gold'
                : 'text-gray-600 hover:text-gray-400 hover:bg-terminal-elevated'
            }`}
          >
            <div className="text-xs font-medium">{tab.label}</div>
            <div className="text-2xs opacity-50 mt-0.5">{tab.desc}</div>
          </button>
        ))}
      </nav>

      {positions.length > 0 && (
        <div className="px-5 pb-4 text-2xs text-gray-700">
          {positions.length} open position{positions.length !== 1 ? 's' : ''}
        </div>
      )}
    </aside>
  )
}
