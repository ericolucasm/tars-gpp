import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // postgres-js só roda no servidor
  serverExternalPackages: ['postgres'],
  devIndicators: false,
};

export default nextConfig;
