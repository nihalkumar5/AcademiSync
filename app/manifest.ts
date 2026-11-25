import { MetadataRoute } from 'next';
import { BRAND, IS_COLLEGE_BRAND } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: IS_COLLEGE_BRAND ? `${BRAND.name} — ${BRAND.tagline}` : 'Intersemester — Academic Planner & Timetable',
    short_name: BRAND.shortName,
    description: 'Smart academic assistant that helps students manage classes, tasks, carry lists and exams.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#8C6B5D',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
