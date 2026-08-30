/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Z3JlYXQtbWFybGluLTc5OTcuY2xlcmsuYWNjb3VudHMuZGV2JA",
    CLERK_SECRET_KEY: "sk_test_Jy7AD5HGNNYIkkIt7mv6tFKbRwjEjN5HMxMY2oQKq1",
  },
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/splash-screen",
    "@capacitor/share",
    "@capacitor/local-notifications",
    "@capacitor/push-notifications"
  ],
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
