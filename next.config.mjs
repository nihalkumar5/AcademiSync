/** @type {import('next').NextConfig} */
const nextConfig = {
  // Iconoir ships one barrel with ~1,700 icons; only bundle the ones we import.
  experimental: { optimizePackageImports: ["iconoir-react"] },
  // The app doesn't use next/image; turning the optimizer off removes the /_next/image attack surface
  images: {
    unoptimized: true,
  },
  // Excel reports are built on the server; keep exceljs as a plain Node dependency instead of bundling it
  serverExternalPackages: ['exceljs'],
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/splash-screen",
    "@capacitor/share",
    "@capacitor/local-notifications",
    "@capacitor/push-notifications"
  ],
  async headers() {
    return [
      {
        // Service worker for web push: always revalidate so users get updates right away
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://academisync-c1a37.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@capacitor/core': false,
        '@capacitor/splash-screen': false,
        '@capacitor/share': false,
        '@capacitor/local-notifications': false,
        '@capacitor/push-notifications': false,
      };
    }
    return config;
  }
};

export default nextConfig;
