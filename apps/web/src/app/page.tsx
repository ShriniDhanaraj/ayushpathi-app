export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div>
          <h1 className="text-5xl font-bold text-gray-900">Ayushpathi</h1>
          <p className="mt-3 text-lg text-gray-500">Bringing Traditional Indian Medicine to the World</p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <a href="/auth/register"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 px-6 rounded-xl text-center transition-colors">
            Register — Patient or Doctor
          </a>
          <a href="/auth/login"
            className="block w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-6 rounded-xl text-center border border-gray-300 transition-colors">
            Sign In
          </a>
        </div>

        <p className="text-xs text-gray-400 pt-4">
          AYUSH · Ayurveda · Yoga & Naturopathy · Unani · Siddha · Homeopathy
        </p>
      </div>
    </div>
  )
}
