import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@smart-bazar/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
