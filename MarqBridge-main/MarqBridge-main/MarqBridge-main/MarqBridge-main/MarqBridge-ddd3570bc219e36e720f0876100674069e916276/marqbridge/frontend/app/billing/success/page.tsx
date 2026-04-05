'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type BillingSuccessProps = {
  searchParams: Promise<{
    tier?: 'pro' | 'prop'
  }>
}

export default function BillingSuccess({ searchParams }: BillingSuccessProps) {
  const router = useRouter()
  const [tier, setTier] = useState<'pro' | 'prop' | null>(null)

  useEffect(() => {
    const init = async () => {
      const params = await searchParams
      const currentTier =
        params.tier === 'prop' || params.tier === 'pro'
          ? params.tier
          : (localStorage.getItem('marq_tier') as 'pro' | 'prop' | null)

      if (currentTier) {
        localStorage.setItem('marq_tier', currentTier)
        setTier(currentTier)
      }
    }

    init()
    const redirect = window.setTimeout(() => router.push('/'), 2000)
    return () => window.clearTimeout(redirect)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center text-center space-y-4">
      <div>
        <div className="w-16 h-16 rounded-full bg-risk-safe/15 border border-risk-safe/30 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M6 14L11 19L22 9" stroke="#4ade80"
                  strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <p className="text-white font-medium text-lg mb-2">
          {tier === 'prop' ? 'Prop Desk' : tier === 'pro' ? 'Pro' : 'Plan'} activated
        </p>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
