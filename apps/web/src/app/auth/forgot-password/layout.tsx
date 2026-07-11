import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Reset your Ayushpathi account password.',
  robots: { index: false },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
