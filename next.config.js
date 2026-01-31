/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['require-in-the-middle', '@opentelemetry/instrumentation'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
