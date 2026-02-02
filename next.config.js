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
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals.push(
        '@opentelemetry/instrumentation',
        '@opentelemetry/sdk-node',
        'require-in-the-middle'
      );
    }
    return config;
  },
  devIndicators: {
    allowedDevOrigins: [
      'https://9000-firebase-studio-1751997679759.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev',
      'https://6000-firebase-studio-1751997679759.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev',
    ],
  },
};

module.exports = nextConfig;
