const withPWA = require('next-pwa')({
  dest:          'public',
  disable:       process.env.NODE_ENV === 'development',
  register:      true,
  skipWaiting:   true,
  runtimeCaching: [
    {
      urlPattern: /^\/api\/proxy\//,
      handler:    'NetworkFirst',
      options: {
        cacheName:         'api-cache',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 30 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output:          'standalone',
  compress:        true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}

module.exports = withPWA(nextConfig)
