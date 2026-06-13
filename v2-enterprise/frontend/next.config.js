/** @type {import('next').NextConfig} */

// FLASK_BACKEND_URL: override to point Next.js proxy at a different Flask host.
// Defaults to localhost:5000 (desktop mode).
// For Cloudflare Tunnel / VPS: this stays localhost:5000 since Next.js and
// Flask run on the same machine â€” the tunnel only exposes Next.js to the internet.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      // Ø£ÙŠ Ø±Ø§Ø¨Ø· Ù‚Ø¯ÙŠÙ… Ù„Ù€ /accounting-integrity ÙŠÙ Ø­ÙˆÙŽÙ‘Ù„ Ù„Ù„ØµÙ Ø­Ø© Ø§Ù„Ø¬Ø¯ÙŠØدة Ù ÙŠ Next.js
      {
        source: '/accounting-integrity',
        destination: '/reports/accounting-rules',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/branch/switch',
        destination: `${BACKEND_URL}/api/auth/switch-branch`,
      },
      {
        source: '/static/:path*',
        destination: `${BACKEND_URL}/static/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/static/**',
      },
    ],
  },
}

module.exports = withBundleAnalyzer(nextConfig)
