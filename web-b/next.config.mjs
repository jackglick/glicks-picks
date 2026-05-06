/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/b',
  assetPrefix: '/b',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
