import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Ayushpathi collects, uses, stores and protects your personal and health data under the Digital Personal Data Protection Act, 2023 (DPDP Act).',
}

const LAST_UPDATED = '12 July 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
        <span className="font-semibold text-gray-900">Privacy Policy</span>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="card p-6 sm:p-8 space-y-6 text-sm text-gray-700 leading-relaxed">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-xs text-gray-400 mt-1">Last updated: {LAST_UPDATED}</p>
          </div>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Who we are</h2>
            <p>
              Ayushpathi (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an Indian digital health platform that connects
              patients with verified AYUSH practitioners — Ayurveda, Yoga &amp; Naturopathy, Unani, Siddha and
              Homeopathy. We act as a <strong>Data Fiduciary</strong> under the Digital Personal Data Protection
              Act, 2023 (&ldquo;DPDP Act&rdquo;) for the personal data you entrust to us.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Data we collect</h2>
            <p className="mb-2">We collect only what is needed to run the service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Identity &amp; contact:</strong> name, date of birth, gender, mobile number, email, address.</li>
              <li><strong>Health data:</strong> appointments, consultation notes, diagnoses, prescriptions, test results, health profile and family member details you choose to add.</li>
              <li><strong>Practitioner data:</strong> qualifications, registration number and council, specialization, practice locations, availability.</li>
              <li><strong>Language preferences</strong> used to show the app and communicate with you in your language.</li>
              <li><strong>Technical data:</strong> device push-notification tokens and basic usage logs needed for security and troubleshooting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Why we process it</h2>
            <p>
              We process your data to register your account, book and manage appointments, enable teleconsultations,
              maintain your health records, deliver prescriptions, send appointment reminders and one-time passwords
              (OTP), provide support over WhatsApp, and meet our legal obligations. Our legal basis is your
              <strong> consent</strong>, which you give at registration and may withdraw at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Consent and doctor access</h2>
            <p>
              Your health records are shared with a doctor only while you hold an <strong>active consent</strong> with
              that doctor. You can revoke a doctor&rsquo;s access at any time from the &ldquo;My Doctors&rdquo; screen;
              revocation takes effect immediately. Hospital staff (receptionists, hospital admins) see only the
              information needed for their role at their hospital, and must verify your identity — including your
              registered address — before disclosing anything to a caller.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Who we share it with</h2>
            <p className="mb-2">We never sell your data. We share it only with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Practitioners and hospital staff, strictly as described in section 4.</li>
              <li>
                <strong>Data processors</strong> that host and operate the platform (database and file storage,
                web hosting, WhatsApp/SMS message delivery, and optical text recognition for scanned prescriptions),
                bound by contract to process data only on our instructions.
              </li>
              <li>Government authorities where the law requires it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Storage and security</h2>
            <p>
              Your data is stored in data centres located in India. Access is protected by role-based access
              controls and row-level security at the database layer, encrypted connections (TLS), and audit
              fields recording who created or changed clinical entries. Prescriptions record who entered them
              and whether a doctor has verified them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Retention</h2>
            <p>
              We keep your data while your account is active. If you delete your account or withdraw consent,
              we erase your personal data unless a law requires us to keep it (for example, medical-record
              retention rules), in which case it is retained only for that period and purpose.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Your rights (DPDP Act, 2023)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access a summary of the personal data we hold about you and how it is processed.</li>
              <li>Correct inaccurate or incomplete data, or update it from your profile.</li>
              <li>Erase your data by deleting your account, subject to legal retention requirements.</li>
              <li>Withdraw consent at any time — overall, or per doctor via &ldquo;My Doctors&rdquo;.</li>
              <li>Nominate another person to exercise these rights if you are unable to.</li>
              <li>
                Raise a grievance with us (section 10). If unresolved, you may complain to the
                Data Protection Board of India.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Children and dependants</h2>
            <p>
              Accounts for persons under 18 must be created and managed by a parent or lawful guardian, who
              provides verifiable consent on their behalf. Family-member records you add are visible only to
              you and to doctors you have granted consent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Contact &amp; grievances</h2>
            <p>
              For privacy questions, data requests or grievances, contact our support team on WhatsApp at{' '}
              <a href="https://wa.me/919361287432" className="text-brand-600 underline">+91 93612 87432</a>.
              We acknowledge grievances within 72 hours and aim to resolve them within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">11. Changes to this policy</h2>
            <p>
              We will post any changes on this page and update the date above. Material changes will be
              notified in the app or by message before they take effect.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-2 border-t">
            See also our <Link href="/terms" className="underline">Terms of Service</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
