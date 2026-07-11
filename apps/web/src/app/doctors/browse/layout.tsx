import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find AYUSH Doctors',
  description:
    'Search verified Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homeopathy practitioners by specialty, language and city. Book in-person or video consultations.',
  alternates: { canonical: '/doctors/browse' },
}

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children
}
