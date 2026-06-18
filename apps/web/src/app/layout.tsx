import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ayushpathi',
  description: 'Bringing Traditional Indian Medicine to the World',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
