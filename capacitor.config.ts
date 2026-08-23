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
      launchShowDuration: 4000, // Show splash screen for 4 seconds to hide WebView load
      launchAutoHide: true,
      backgroundColor: '#FAFAF8',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    }
  }
};

export default config;
