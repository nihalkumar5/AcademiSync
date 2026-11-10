import type { Metadata } from 'next';
import NotFoundScene from '@/components/misc/NotFoundScene';

export const metadata: Metadata = { title: 'Page not found · Intersemester' };

export default function NotFound() {
  return <NotFoundScene />;
}
