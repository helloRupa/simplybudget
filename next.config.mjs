/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/simplybudget',
  assetPrefix: '/simplybudget',
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
