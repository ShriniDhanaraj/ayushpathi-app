import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Ayushpathi to book AYUSH appointments and manage your health records.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
