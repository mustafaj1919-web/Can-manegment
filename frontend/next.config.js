/** @type {import('next').NextConfig} */

// FLASK_BACKEND_URL: override to point Next.js proxy at a different Flask host.
// Defaults to localhost:5000 (desktop mode).
// For Cloudflare Tunnel / VPS: this stays localhost:5000 since Next.js and
// Flask run on the same machine — the tunnel only exposes Next.js to the internet.
const FLASK = process.env.FLASK_BACKEND_URL || 'http://localhost:5000'

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      // أي رابط قديم لـ /accounting-integrity يُحوَّل للصفحة الجديدة في Next.js
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
        destination: `${FLASK}/api/:path*`,
      },
      {
        source: '/branch/switch',
        destination: `${FLASK}/branch/switch`,
      },
      {
        source: '/static/:path*',
        destination: `${FLASK}/static/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/static/**',
      },
    ],
  },
}

module.exports = nextConfig
