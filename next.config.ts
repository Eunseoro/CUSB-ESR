import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['sharp'],
  // 이미지 최적화 설정
  images: {
    domains: ['localhost'],
    unoptimized: true, // 개발 환경에서 이미지 최적화 비활성화
  },
};

export default nextConfig;
