/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autonome pour une image Docker légère (server.js + node_modules minimal).
  output: 'standalone',
  poweredByHeader: false,
  // Les photos de propriétés et covers viennent du backend / S3 → autoriser le remote.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
