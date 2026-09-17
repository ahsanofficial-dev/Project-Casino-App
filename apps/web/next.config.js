/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow browser calls to the API origin during local/docker use
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
