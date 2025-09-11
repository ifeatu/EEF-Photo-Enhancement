import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // CORS headers removed - now handled centrally in API routes via lib/cors.ts
  // This eliminates CORS configuration conflicts identified in debugging journey
  images: {
    localPatterns: [
      {
        pathname: '/uploads/**',
        search: ''
      },
      {
        pathname: '/uploads/*-enhanced-*.jpg',
        search: ''
      }
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'blob.vercel-storage.com',
        port: '',
        pathname: '/**'
      }
    ]
  }
};

export default nextConfig;
