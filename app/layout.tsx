import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'Intersemester — Your Academic Life, Organized',
  description:
    'Smart academic assistant that helps students manage their classes, tasks, deadlines, and everyday campus life with clarity and calm.',
};

import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-[100dvh] bg-[#F7F4EB] dark:bg-[#171615] text-[#181716] dark:text-[#F4F1EA] antialiased flex flex-col font-sans selection:bg-[#96725B] selection:text-white">
          <AppProvider>{children}</AppProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
