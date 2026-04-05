import type { Metadata } from 'next'
import './globals.css'
import ClientProviders from '@/components/providers/ClientProviders'

export const metadata: Metadata = {
  title:       'MarqBridge — Risk-first trading OS',
  description: 'Professional risk management. Pre-trade gate, liquidation alerts, circuit breaker.',
  themeColor:  '#0a0a0a',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:          true,
    statusBarStyle:   'black-translucent',
    title:            'MarqBridge',
  },
  viewport: {
    width:           'device-width',
    initialScale:    1,
    maximumScale:    1,
    userScalable:    false,
  },
  keywords: ['trading', 'risk management', 'margin', 'crypto', 'forex'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
