'use client'

import Layout from '@/components/common/Layout'
import { useEffect, useState } from 'react'

export default function QuizzesPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <span className="text-red-600">🧠</span> Quizzes
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Test your Chinese vocabulary knowledge with interactive quizzes
          </p>
          
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              We're working hard to bring you engaging quizzes based on your vocabulary lists. 
              This feature will be available soon!
            </p>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Multiple choice questions
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Pinyin recognition
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                Character writing practice
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                Adaptive difficulty
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}