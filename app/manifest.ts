import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Intersemester — Academic Planner & Timetable',
    short_name: 'Intersemester',
    description: 'Smart academic assistant that helps students manage classes, tasks, carry lists and exams.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#FAFAF8',
    theme_color: '#8C6B5D',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
