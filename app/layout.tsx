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
        <body className="min-h-[100dvh] bg-[#F5F7FA] dark:bg-[#0B0F19] text-[#0F172A] dark:text-zinc-100 antialiased flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
          <AppProvider>{children}</AppProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
