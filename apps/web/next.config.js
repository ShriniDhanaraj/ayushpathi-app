/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
  // TypeScript and ESLint are clean — strict checks re-enabled
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
}

module.exports = nextConfig
