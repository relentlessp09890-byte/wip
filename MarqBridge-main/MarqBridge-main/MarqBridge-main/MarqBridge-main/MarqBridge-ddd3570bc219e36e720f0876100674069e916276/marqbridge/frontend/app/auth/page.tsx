import { Suspense } from 'react'
import AuthPageClient from '@/components/auth/AuthPageClient'

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center text-white">
        Loading authentication...
      </div>
    }>
      <AuthPageClient />
    </Suspense>
  )
}
