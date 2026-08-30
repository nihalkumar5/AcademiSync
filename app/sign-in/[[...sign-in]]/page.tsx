'use client';

import dynamic from 'next/dynamic';

const AuthPage = dynamic(
  () => import('@/components/auth/AuthPage').then((mod) => mod.AuthPage),
  { ssr: false }
);

export default function Page() {
  return <AuthPage mode="signin" />;
}
