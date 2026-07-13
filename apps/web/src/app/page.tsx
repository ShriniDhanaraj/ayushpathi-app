import Link from 'next/link'

export default function Home() {
  const features = [
    { icon: '🌿', title: 'Ayurveda', desc: 'Ancient wisdom for holistic healing', color: 'bg-spec-ayu-bg border-spec-ayu-border text-spec-ayu-text' },
    { icon: '🧘', title: 'Yoga & Naturopathy', desc: 'Mind-body balance and natural cures', color: 'bg-spec-yog-bg border-spec-yog-border text-spec-yog-text' },
    { icon: '🌙', title: 'Unani', desc: 'Greco-Arabic tradition of medicine', color: 'bg-spec-una-bg border-spec-una-border text-spec-una-text' },
    { icon: '⚕️', title: 'Siddha', desc: 'South Indian classical medicine system', color: 'bg-spec-sid-bg border-spec-sid-border text-spec-sid-text' },
    { icon: '💊', title: 'Homeopathy', desc: 'Like cures like, minimal doses', color: 'bg-spec-hom-bg border-spec-hom-border text-spec-hom-text' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-ivory to-ivory">
      {/* Hero */}
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-6 shadow-lg">
          <span className="text-white text-3xl font-bold">A</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
          Ayushpathi
        </h1>
        <p className="mt-3 text-lg sm:text-xl text-gray-500 leading-relaxed">
          India&apos;s trusted platform for traditional AYUSH medicine
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Connect with verified Ayurveda, Yoga, Unani, Siddha &amp; Homeopathy practitioners
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/doctors/browse"
            className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-3.5 px-8 rounded-xl text-center transition-colors shadow-sm"
          >
            Find a practitioner
          </Link>
          <Link
            href="/auth/register"
            className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-8 rounded-xl text-center border border-gray-300 transition-colors"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/auth/login"
            className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-8 rounded-xl text-center border border-gray-300 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Feature pills */}
      <div className="max-w-3xl mx-auto px-6 pb-10">
        <div className="flex flex-wrap gap-2 justify-center">
          {features.map(f => (
            <div key={f.title} className={`flex items-center gap-2 border rounded-full px-4 py-2 shadow-sm ${f.color}`}>
              <span>{f.icon}</span>
              <span className="text-sm font-medium">{f.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust row */}
      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-600">100%</p>
              <p className="text-xs text-gray-500 mt-1">Verified practitioners</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-600">🇮🇳</p>
              <p className="text-xs text-gray-500 mt-1">Data stored in India</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-600">DPDP</p>
              <p className="text-xs text-gray-500 mt-1">Act 2023 compliant</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center space-y-2">
        <p className="text-xs text-gray-400">
          AYUSH · Ayurveda · Yoga &amp; Naturopathy · Unani · Siddha · Homeopathy
        </p>
        <p className="text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600 underline">Privacy Policy</Link>
          {' · '}
          <Link href="/terms" className="hover:text-gray-600 underline">Terms of Service</Link>
        </p>
      </footer>
    </div>
  )
}
