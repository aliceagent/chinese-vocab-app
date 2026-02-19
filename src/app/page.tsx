import Link from 'next/link'
import BuildInfo from '@/components/common/BuildInfo'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-3xl font-bold text-red-600">汉</span>
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Chinese Vocab
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Learn Chinese
            <span className="text-red-600"> Your Way</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Upload your own materials, extract vocabulary, generate
            personalized stories, and test your knowledge with adaptive quizzes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors inline-flex items-center justify-center min-h-[56px]"
            >
              Start Learning Free
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="#features"
              className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-xl text-lg font-medium border-2 border-gray-200 transition-colors inline-flex items-center justify-center min-h-[56px]"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div id="features" className="mt-24 grid md:grid-cols-3 gap-8">
          {/* Upload Feature */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
              <svg
                className="w-7 h-7 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Upload Documents
            </h3>
            <p className="text-gray-600">
              Upload PDF, DOC, or TXT files. Our AI extracts Chinese vocabulary
              automatically and classifies by HSK level.
            </p>
          </div>

          {/* Story Feature */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
              <svg
                className="w-7 h-7 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              AI-Generated Stories
            </h3>
            <p className="text-gray-600">
              Generate personalized stories using your vocabulary. Toggle Pinyin
              and English translations sentence by sentence.
            </p>
          </div>

          {/* Quiz Feature */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
              <svg
                className="w-7 h-7 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Adaptive Quizzes
            </h3>
            <p className="text-gray-600">
              Test your knowledge with multiple-choice fill-in-the-blank
              questions. Track progress and master vocabulary over time.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-r from-red-600 to-red-700 rounded-3xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to start learning?
          </h2>
          <p className="text-red-100 mb-8 max-w-xl mx-auto">
            Join thousands of learners mastering Chinese with personalized
            vocabulary practice.
          </p>
          <Link
            href="/register"
            className="bg-white text-red-600 hover:bg-red-50 px-8 py-4 rounded-xl text-lg font-medium transition-colors inline-flex items-center justify-center min-h-[56px]"
          >
            Create Free Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center mb-4 sm:mb-0">
              <span className="text-2xl font-bold text-red-500">汉</span>
              <span className="ml-2 text-lg font-semibold text-white">
                Chinese Vocab
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-2">
              <p className="text-sm">
                © 2026 Chinese Vocab. Learn Chinese your way.
              </p>
              <BuildInfo className="text-gray-500" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
