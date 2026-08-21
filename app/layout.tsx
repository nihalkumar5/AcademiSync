import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'AcademiSync — Pan-India Student Productivity Suite',
  description:
    'Modern, fast academic command center for college students across India: Timetables, Homework deadlines, and automated Tomorrow Carry Bag.',
};

import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={inter.variable}>
        <body className="min-h-[100dvh] bg-[#f8fafc] text-zinc-900 antialiased flex flex-col font-sans selection:bg-blue-500 selection:text-white">
          <AppProvider>{children}</AppProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
