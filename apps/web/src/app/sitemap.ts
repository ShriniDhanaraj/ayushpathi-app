import type { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.rasbros.com'

// Regenerate at most hourly
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/doctors/browse`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/auth/register`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/auth/login`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let doctorRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('doctor')
      .select('id, updated_at')
      .eq('verification_status', 'APPROVED')
      .limit(5000)
    doctorRoutes = (data ?? []).map(d => ({
      url: `${BASE}/doctors/${d.id}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // If the DB is unreachable at generation time, ship static routes only
  }

  return [...staticRoutes, ...doctorRoutes]
}
