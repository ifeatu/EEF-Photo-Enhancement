import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
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
