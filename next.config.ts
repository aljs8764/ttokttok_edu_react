import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // MUI 아이콘은 개별 import 로 변환 (번들 크기)
  modularizeImports: {
    '@mui/icons-material': { transform: '@mui/icons-material/{{member}}' },
  },
  poweredByHeader: false,
};

export default nextConfig;
