import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of the Ayushpathi AYUSH healthcare platform.',
}

const LAST_UPDATED = '12 July 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
        <span className="font-semibold text-gray-900">Terms of Service</span>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="card p-6 sm:p-8 space-y-6 text-sm text-gray-700 leading-relaxed">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-xs text-gray-400 mt-1">Last updated: {LAST_UPDATED}</p>
          </div>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. What Ayushpathi is</h2>
            <p>
              Ayushpathi is a platform that connects patients with independently practising, verified AYUSH
              practitioners and hospitals for in-person and video consultations, and helps you keep your
              health records in one place. By creating an account or using the service you accept these terms
              and our <Link href="/privacy" className="text-brand-600 underline">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Not for emergencies — no medical advice from the platform</h2>
            <p>
              Ayushpathi does not provide medical advice, diagnosis or treatment itself. All clinical decisions
              are made by the practitioner you consult, who is solely responsible for the care they provide.
              <strong> Do not use the platform for medical emergencies</strong> — contact local emergency
              services or go to the nearest hospital.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Accounts and eligibility</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate information and keep your credentials confidential.</li>
              <li>Accounts for persons under 18 must be created and operated by a parent or lawful guardian.</li>
              <li>Hospital and receptionist accounts are created by the relevant hospital administrator.</li>
              <li>You are responsible for activity that happens under your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Practitioner verification</h2>
            <p>
              Practitioners must submit their qualifications, registration number and registration council, and
              are listed publicly only after approval. Verification confirms registration details as submitted;
              it is not an endorsement or a guarantee of treatment outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Appointments and teleconsultations</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Appointment slots reflect the availability practitioners publish and may change.</li>
              <li>You may cancel appointments in the app; repeated no-shows may limit your ability to book.</li>
              <li>Teleconsultations use a video link generated for your appointment. Any consultation or teleconsult fee shown is set by the practitioner or hospital.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Health records and prescriptions</h2>
            <p>
              Records on the platform (consultation notes, prescriptions, test results) are entered by you, your
              practitioners or hospital staff. Prescriptions carry an audit trail showing who entered them and
              whether the doctor has verified them. Doctors see your records only while you hold an active
              consent with them, which you can revoke at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>impersonate another person, or register a practitioner account without valid credentials;</li>
              <li>upload content that is unlawful, false or infringes others&rsquo; rights;</li>
              <li>attempt to access other users&rsquo; data or interfere with the platform&rsquo;s security or operation;</li>
              <li>use the platform to send spam or unsolicited marketing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Liability</h2>
            <p>
              To the maximum extent permitted by law, Ayushpathi is not liable for the acts or omissions of
              practitioners or hospitals, for indirect or consequential losses, or for unavailability of the
              service beyond our reasonable control. Nothing in these terms limits liability that cannot be
              limited under Indian law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Suspension and termination</h2>
            <p>
              We may suspend or terminate accounts that breach these terms or pose a risk to other users.
              You may delete your account at any time; data handling on deletion is described in the
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Governing law and changes</h2>
            <p>
              These terms are governed by the laws of India, and the courts at Chennai, Tamil Nadu have
              exclusive jurisdiction. We may update these terms; material changes will be notified in the app
              before they take effect. Questions? Reach us on WhatsApp at{' '}
              <a href="https://wa.me/919361287432" className="text-brand-600 underline">+91 93612 87432</a>.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-2 border-t">
            See also our <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
