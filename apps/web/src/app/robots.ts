import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.rasbros.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/admin/',
          '/hospital-admin/',
          '/receptionist/',
          '/patients/',
          '/appointments/',
          '/consultation/',
          '/records/',
          '/results/',
          '/profile/',
          '/availability/',
          '/auth/callback',
          '/auth/reset-password',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
