
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // force-rebuild
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com'
      }
    ],
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
   webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.externals.push({
        handlebars: 'commonjs handlebars',
      });
    }
     config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /node_modules\/@opentelemetry\/sdk-node/,
        (data: any) => {
          for (const dependency of data.dependencies) {
            if (dependency.request === '@opentelemetry/exporter-jaeger') {
              dependency.critical = false;
            }
          }
          return data;
        },
      )
    );
    return config;
  },
};

export default nextConfig;
