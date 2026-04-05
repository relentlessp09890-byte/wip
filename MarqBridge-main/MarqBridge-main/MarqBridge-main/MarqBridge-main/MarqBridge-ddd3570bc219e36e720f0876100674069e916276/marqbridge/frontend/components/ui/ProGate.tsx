'use client'
import type { ReactNode } from 'react'
import { getCurrentTier } from '@/lib/tierGate'
import { startCheckout } from '@/lib/billing'

export function ProGate({
  feature,
  children,
}: {
  feature: string
  children: ReactNode
}) {
  if (typeof window !== 'undefined') {
    const tier = getCurrentTier()
    if (tier === 'pro' || tier === 'prop') {
      return <>{children}</>
    }
  }

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-terminal-bg/60 rounded-xl backdrop-blur-[1px]">
        <div className="text-center px-4 py-3 bg-terminal-elevated border border-brand-gold/20 rounded-xl">
          <p className="text-2xs text-brand-gold font-medium mb-1">Pro feature</p>
          <p className="text-2xs text-gray-600 mb-2">{feature}</p>
          <button
            onClick={() => startCheckout('pro')}
            className="text-2xs text-brand-gold border border-brand-gold/30 rounded px-2 py-0.5 hover:bg-brand-gold/10 transition-colors"
          >
            Upgrade to Pro →
          </button>
        </div>
      </div>
    </div>
  )
}
