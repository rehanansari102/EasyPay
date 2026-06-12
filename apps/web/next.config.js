/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@easypay/shared'],
  // Next.js 15: caching defaults changed — fetch requests are no longer cached by default
  // Set per-route or per-fetch as needed
  experimental: {
    // reactCompiler requires babel-plugin-react-compiler — enable later with: pnpm add -D babel-plugin-react-compiler -w
    // reactCompiler: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
