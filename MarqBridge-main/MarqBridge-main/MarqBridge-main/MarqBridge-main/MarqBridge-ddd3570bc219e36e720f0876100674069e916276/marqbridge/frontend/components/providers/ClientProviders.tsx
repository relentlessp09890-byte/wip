'use client'
import { useEffect, useState } from 'react'
import { connectWS } from '@/lib/wsClient'
import { ToastContainer } from '@/components/ui/NotificationSystem'

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {
  const [online, setOnline] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    connectWS()
    const handleOffline = () => setOnline(false)
    const handleOnline = () => {
      setOnline(true)
      connectWS()
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <>
      {!online && (
        <div className="w-full bg-risk-danger/15 border-b
                        border-risk-danger/30 px-4 py-2 text-center
                        text-xs text-risk-danger">
          Network offline — data may be stale. Reconnecting...
        </div>
      )}
      {children}
      {mounted && <ToastContainer />}
    </>
  )
}
