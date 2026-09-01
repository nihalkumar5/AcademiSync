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
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#111110' },
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
    <html lang="en" className="bg-[#FAFAF8] dark:bg-[#111110]" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo51.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo51.png" />
        <meta name="apple-mobile-web-app-title" content="Intersemester" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)) {
                    var params = new URLSearchParams(window.location.search);
                    var invite = params.get('invite') || params.get('key');
                    var calendarInvite = params.get('calendar_invite');
                    var examsInvite = params.get('exams_invite');
                    var task = params.get('task');
                    
                    if (invite) {
                      var intent = "intent://invite?key=" + encodeURIComponent(invite) + "#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=" + encodeURIComponent(window.location.href) + ";end";
                      window.location.replace(intent);
                    } else if (calendarInvite) {
                      var intent = "intent://calendar_invite?key=" + encodeURIComponent(calendarInvite) + "#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=" + encodeURIComponent(window.location.href) + ";end";
                      window.location.replace(intent);
                    } else if (examsInvite) {
                      var intent = "intent://exams_invite?key=" + encodeURIComponent(examsInvite) + "#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=" + encodeURIComponent(window.location.href) + ";end";
                      window.location.replace(intent);
                    } else if (task) {
                      var intent = "intent://task?task=" + encodeURIComponent(task) + "#Intent;scheme=com.intersemester.app;package=com.intersemester.app;S.browser_fallback_url=" + encodeURIComponent(window.location.href) + ";end";
                      window.location.replace(intent);
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-[100dvh] bg-[#FAFAF8] dark:bg-[#111110] text-[#111111] dark:text-[#F7F7F5] antialiased flex flex-col font-sans selection:bg-[#96725B] selection:text-white">
        <AppProvider>
          {children}
          <Analytics />
        </AppProvider>
      </body>
    </html>
  );
}
