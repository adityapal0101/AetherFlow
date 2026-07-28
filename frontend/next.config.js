/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static export — deployable to Cloudflare Pages (and any static host).
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
