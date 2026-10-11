/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autonome pour une image Docker légère (server.js + node_modules minimal).
  output: 'standalone',
  poweredByHeader: false,
  // Les photos de propriétés et covers viennent du backend / S3 → autoriser le remote.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Carte Baitly : tuiles, glyphes, styles et plugin RTL servis en MÊME ORIGINE sous
  // /maps/ (relais vers le stockage public des cartes Baitly) — pas de CORS, pas de CSP
  // à élargir. Lu au build : BAITLY_MAPS_ORIGIN surcharge la valeur par défaut.
  async rewrites() {
    const origin = (process.env.BAITLY_MAPS_ORIGIN ?? 'https://baitly-cartes.s3.gra.io.cloud.ovh.net/maps').replace(/\/$/, '');
    return [{ source: '/maps/:path*', destination: `${origin}/:path*` }];
  },
};

export default nextConfig;
