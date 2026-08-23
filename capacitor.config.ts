import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.intersemester.app',
  appName: 'Intersemester',
  webDir: 'out',
  server: {
    url: 'https://academi-sync-chi.vercel.app/',
    cleartext: true,
    allowNavigation: [
      'academi-sync-chi.vercel.app',
      '*.clerk.accounts.dev',
      'clerk.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Show native splash screen for 0 seconds to immediately display Next.js splash
      launchAutoHide: true,
      backgroundColor: '#FAFAF8',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    }
  }
};

export default config;
