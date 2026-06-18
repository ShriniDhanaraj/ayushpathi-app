'use client'
import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-2">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500">
          We encountered an unexpected error. This has been logged and we&apos;ll look into it.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="btn-primary px-6"
          >
            Try again
          </button>
          <a href="/dashboard/patient" className="btn-secondary px-6">
            Go to dashboard
          </a>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
