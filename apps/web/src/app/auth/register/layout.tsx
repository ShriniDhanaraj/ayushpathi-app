import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Register as a patient or AYUSH practitioner on Ayushpathi — free to get started.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
