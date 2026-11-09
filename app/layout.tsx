import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0C0D' },
  ],
};

export const metadata: Metadata = {
  title: 'Intersemester — Your Academic Life, Organized',
  description:
    'Smart academic assistant that helps students manage their classes, tasks, deadlines, and everyday campus life with clarity and calm.',
  icons: {
    icon: '/logo51.png',
    shortcut: '/logo51.png',
    apple: [
      { url: '/logo51.png', sizes: '180x180', type: 'image/png' },
      { url: '/logo51.png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Intersemester',
  },
};
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-canvas" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo51.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo51.png" />
        <meta name="apple-mobile-web-app-title" content="Intersemester" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-[100dvh] bg-canvas text-fg antialiased flex flex-col font-sans selection:bg-[#96725B] selection:text-white">
        <AppProvider>
          {children}
          <Analytics />
        </AppProvider>
      </body>
    </html>
  );
}
