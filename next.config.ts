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
      bodySizeLimit: '10mb'
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
};

export default nextConfig;
