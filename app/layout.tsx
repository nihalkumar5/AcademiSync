import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'Intersemester — Your Academic Life, Organized',
  description:
    'Smart academic assistant that helps students manage their classes, tasks, deadlines, and everyday campus life with clarity and calm.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-[100dvh] bg-[#FAFAF8] dark:bg-[#111110] text-[#141413] dark:text-[#F5F5F3] antialiased flex flex-col font-sans selection:bg-[#96725B] selection:text-white">
          <AppProvider>
            {children}
            <Analytics />
          </AppProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
