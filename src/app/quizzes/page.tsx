'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/common/Layout'

interface VocabList {
  id: string
  name: string
  totalWords: number
  _count?: { vocabularyItems: number }
}

interface QuizRecord {
  id: string
  title: string
  createdAt: string
  quizAttempts: Array<{ score: number; completedAt: string }>
  vocabularyList?: { name: string }
}

const QUIZ_MODES = [
  {
    id: 'multiple-choice',
    label: 'Multiple Choice',
    emoji: '🔤',
    desc: 'Pick the correct English meaning for each character',
  },
  {
    id: 'matching',
    label: 'Matching Game',
    emoji: '🔗',
    desc: 'Connect Chinese characters to their English meanings',
  },
  {
    id: 'speed-round',
    label: 'Speed Round',
    emoji: '⚡',
    desc: '60 seconds. Answer as many as you can. Streak bonuses!',
  },
  {
    id: 'match-attack',
    label: 'Match Attack',
    emoji: '🎯',
    desc: 'Swipe right if it matches, left if it doesn\'t. 3 lives!',
  },
]

export default function QuizzesPage() {
  const router = useRouter()
  const [lists, setLists] = useState<VocabList[]>([])
  const [recentQuizzes, setRecentQuizzes] = useState<QuizRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [selectedList, setSelectedList] = useState<string>('')
  const [quizType, setQuizType] = useState<string>('multiple-choice')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/vocabulary/lists').then(r => r.json()),
      fetch('/api/quizzes').then(r => r.json()),
    ]).then(([listsRes, quizzesRes]) => {
      if (listsRes.success) setLists(listsRes.data)
      if (quizzesRes.success) setRecentQuizzes(quizzesRes.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function startQuiz() {
    if (!selectedList) {
      setError('Please select a vocabulary list')
      return
    }
    setStarting(true)
    setError('')
    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyListId: selectedList, quizType, questionCount: 10 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      router.push(`/quizzes/${data.data.quizId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-20 sm:pb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">🧠 Quizzes</h1>
        <p className="text-gray-500 mb-8 text-sm">Test your Chinese vocabulary knowledge</p>

        {/* Start a Quiz */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Start a Quiz</h2>

          {lists.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No vocabulary lists yet.{' '}
              <a href="/upload" className="text-red-600 underline">Upload a document</a> to get started.
            </p>
          ) : (
            <>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Vocabulary List
              </label>
              <select
                value={selectedList}
                onChange={e => setSelectedList(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 mb-5 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              >
                <option value="">— choose a list —</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l._count?.vocabularyItems ?? l.totalWords} words)
                  </option>
                ))}
              </select>

              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {QUIZ_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setQuizType(mode.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      quizType === mode.id
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-xl block mb-0.5">{mode.emoji}</span>
                    <span className={`text-xs font-semibold block ${quizType === mode.id ? 'text-red-700' : 'text-gray-800'}`}>
                      {mode.label}
                    </span>
                    <span className="text-xs text-gray-400 leading-tight block mt-0.5">
                      {mode.desc}
                    </span>
                  </button>
                ))}
              </div>

              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

              <button
                onClick={startQuiz}
                disabled={starting}
                className="w-full bg-red-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {starting ? 'Generating…' : '▶ Start'}
              </button>
            </>
          )}
        </div>

        {/* Recent Quizzes */}
        {recentQuizzes.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Quizzes</h2>
            <div className="space-y-2">
              {recentQuizzes.map(q => {
                const lastAttempt = q.quizAttempts[0]
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{q.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {lastAttempt ? (
                      <span className={`text-sm font-bold ${
                        lastAttempt.score >= 0.8 ? 'text-green-600' :
                        lastAttempt.score >= 0.5 ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {Math.round(lastAttempt.score * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not attempted</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
