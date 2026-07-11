'use client'
import { useState } from 'react'
import Link from 'next/link'
import PatientRegisterForm from '@/components/forms/PatientRegisterForm'
import DoctorRegisterForm from '@/components/forms/DoctorRegisterForm'

type Role = 'patient' | 'doctor'

const ROLES = [
  {
    id: 'patient' as Role,
    icon: '🧑‍⚕️',
    title: 'Patient',
    desc: 'Register to book appointments and manage your health records',
  },
  {
    id: 'doctor' as Role,
    icon: '👨‍⚕️',
    title: 'Doctor / Practitioner',
    desc: 'Register as an AYUSH practitioner — subject to verification',
  },
]

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  if (selectedRole === 'patient') return <PatientRegisterForm onBack={() => setSelectedRole(null)} />
  if (selectedRole === 'doctor')  return <DoctorRegisterForm  onBack={() => setSelectedRole(null)} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Who are you registering as?</p>
        </div>

        <div className="space-y-3">
          {ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className="w-full card p-5 text-left hover:border-brand-400 hover:shadow-md transition-all duration-150 group"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{role.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-brand-700">{role.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{role.desc}</p>
                </div>
                <span className="ml-auto text-gray-400 group-hover:text-brand-600">→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          Hospital / Receptionist accounts are created by your Hospital Admin.
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
