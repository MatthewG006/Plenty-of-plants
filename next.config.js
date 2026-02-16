/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
      'https://9000-firebase-studio-1751997679759.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev',
      'https://6000-firebase-studio-1751997679759.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev',
    ],
  },
};

module.exports = nextConfig;
