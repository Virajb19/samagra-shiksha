import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cloud.appwrite.io',
        pathname: '/v1/storage/**',
      },
       {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9199',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
       {
        protocol: "https",
        hostname: "images.unsplash.com", 
      },
    ],
  },

  // Proxy API requests through Vercel to make cookies same-origin.
  // Browser calls /api/proxy/... → Vercel forwards to Render backend.
  // This avoids cross-origin cookie issues (SameSite, third-party blocking).
  async rewrites() {
    const backendUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
