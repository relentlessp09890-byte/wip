'use client'
import { useEffect, useState } from 'react'
import { connectWS } from '@/lib/wsClient'

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    connectWS()
    const handleOffline = () => setOnline(false)
    const handleOnline = () => {
      setOnline(true)
      connectWS()
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (online) {
    return null
  }

  return (
    <div className="w-full bg-risk-danger/15 border-b border-risk-danger/30 px-4 py-2 text-center">
      <span className="text-xs text-risk-danger">
        Network offline — data may be stale. Reconnecting...
      </span>
    </div>
  )
}
