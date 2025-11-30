import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb'  // Server Actions 크기 제한 증가
    }
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/files/:path*',
      },
    ];
  },
  compiler: {
    // 프로덕션 빌드에서 콘솔 로그 제거
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // API Routes 바디 크기 제한 (Next.js 15+)
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
