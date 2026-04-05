'use client'

import { useEffect } from 'react'
import { connectWS } from '@/lib/wsClient'

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    connectWS()
  }, [])

  return <>{children}</>
}
