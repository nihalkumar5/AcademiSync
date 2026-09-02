/** @type {import('next').NextConfig} */
const nextConfig = {
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
