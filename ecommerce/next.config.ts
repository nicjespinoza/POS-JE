import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Only use 'export' for production builds on Firebase Hosting (SSG)
  // In development, we use 'next dev' server to support rewrites/proxy to Vite
  output: isProd ? 'export' : undefined,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // Redirects to enforce trailing slash for /sys
  async redirects() {
    if (isProd) return [];
    return [
      {
        source: '/sys',
        destination: '/sys/',
        permanent: true,
      },
    ];
  },

  // Rewrites mainly for local development to proxy /sys/ to Vite server
  async rewrites() {
    if (isProd) return []; // No rewrites in static export mode
    return [
      // Proxy everything under /sys/ to Vite
      {
        source: '/sys/:path*',
        destination: 'http://localhost:3000/sys/:path*',
      }
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // ... (Rest of headers logic if needed or reduced for brevity)
          // Simplified CSP for Dev to avoid headaches with Proxy
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; connect-src 'self' https: wss:; frame-src 'self' https:;"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
