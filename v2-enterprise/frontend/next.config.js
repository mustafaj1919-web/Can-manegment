/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: true,
})

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/accounting-integrity',
        destination: '/reports/accounting-rules',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      { source: '/api/:path*',     destination: `${BACKEND_URL}/api/:path*` },
      { source: '/branch/switch',  destination: `${BACKEND_URL}/api/auth/switch-branch` },
      { source: '/static/:path*',  destination: `${BACKEND_URL}/static/:path*` },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8080', pathname: '/static/**' },
    ],
  },
}

module.exports = withBundleAnalyzer(withPWA(nextConfig))
