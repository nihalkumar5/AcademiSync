import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { BRAND, IS_COLLEGE_BRAND } from '@/lib/brand';
import { BrandSplash } from '@/components/brand/BrandSplash';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#161618' },
  ],
};

export const metadata: Metadata = {
  title: IS_COLLEGE_BRAND ? `${BRAND.name} · ${BRAND.tagline}` : 'Intersemester — Your Academic Life, Organized',
  description:
    'Smart academic assistant that helps students manage their classes, tasks, deadlines, and everyday campus life with clarity and calm.',
  icons: {
    icon: '/logo51.png',
    shortcut: '/logo51.png',
    // Home Screen icon (iPhone "Add to Home Screen"): white mark on a dark tile, reads well in light and dark
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.shortName,
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
        <meta name="apple-mobile-web-app-title" content={BRAND.shortName} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* One layout on every phone: in portrait, lay the page out at a 390px design width (360px on
            very small screens) and scale it to the screen, so spacing and proportions match on a
            360px Android and a 430px iPhone alike. Tablets, desktops and landscape keep device-width. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var D=390,MIN=360;function want(){var s=Math.min(screen.width,screen.height);var land=window.matchMedia&&matchMedia('(orientation: landscape)').matches;if(s>=500||land||!s)return 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';var t=s<MIN?MIN:D;var k=(s/t).toFixed(4);return 'width='+t+', initial-scale='+k+', minimum-scale='+k+', maximum-scale='+k+', user-scalable=no, viewport-fit=cover'}function apply(){var m=document.querySelector('meta[name="viewport"]');if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m)}var c=want();if(m.getAttribute('content')!==c)m.setAttribute('content',c)}apply();window.addEventListener('orientationchange',function(){setTimeout(apply,150)});new MutationObserver(apply).observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:['content']})}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-[100dvh] bg-canvas text-fg antialiased flex flex-col font-sans selection:bg-[#96725B] selection:text-white">
        <BrandSplash />
        <AppProvider>
          {children}
          <Analytics />
        </AppProvider>
      </body>
    </html>
  );
}
