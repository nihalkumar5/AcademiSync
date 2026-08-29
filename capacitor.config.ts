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
      launchShowDuration: 5000, // Fallback duration in case programmatic hide fails
      launchAutoHide: false,    // Wait for JS code to trigger hide
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    }
  }
};

export default config;
