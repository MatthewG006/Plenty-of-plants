/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals.push(
        /^@genkit-ai\//, // Exclude all @genkit-ai packages
        /^@opentelemetry\//, // Exclude all @opentelemetry packages
        'genkit', // Exclude the main genkit package
        'zod' // Exclude zod as it's used in server-side flows
      );
    }
    return config;
  },
};

export default nextConfig;
