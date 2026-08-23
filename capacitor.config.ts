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
  }
};

export default config;
