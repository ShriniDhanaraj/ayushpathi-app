import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.rasbros.com'),
  title: {
    default: "Ayushpathi — India's AYUSH Healthcare Platform",
    template: '%s | Ayushpathi',
  },
  description:
    'Book verified Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homeopathy practitioners across India. Appointments, teleconsults, prescriptions and health records — data stored in India, DPDP Act 2023 compliant.',
  keywords: ['AYUSH', 'Ayurveda', 'Yoga', 'Naturopathy', 'Unani', 'Siddha', 'Homeopathy', 'doctor appointment', 'India'],
  openGraph: {
    siteName: 'Ayushpathi',
    type: 'website',
    locale: 'en_IN',
    title: "Ayushpathi — India's AYUSH Healthcare Platform",
    description:
      'Book verified Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homeopathy practitioners across India.',
  },
  twitter: { card: 'summary' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
