"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import StatisticsDashboard from "@/components/analytics/StatisticsDashboard"

export default function StatisticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="flex items-center">
                <span className="text-2xl font-bold text-red-600">汉</span>
                <span className="ml-2 text-lg font-semibold text-gray-900">
                  Chinese Vocab
                </span>
              </a>
              <span className="ml-4 text-gray-500">/</span>
              <span className="ml-4 text-gray-900">Statistics</span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <span className="text-gray-700">
                {session.user?.name || session.user?.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Learning Statistics</h1>
            <p className="text-gray-600 mt-2">
              Track your Chinese vocabulary learning progress and performance
            </p>
          </div>
          
          <StatisticsDashboard />
        </div>
      </main>
    </div>
  )
}