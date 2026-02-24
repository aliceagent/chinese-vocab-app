'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/common/Layout'

type MCQuestion = {
  id: string
  type: 'multiple-choice'
  character: string
  pinyin: string
  correctAnswer: string
  choices: string[]
}

type MatchingPair = {
  id: string
  character: string
  pinyin: string
  meaning: string
}

type MatchingBlock = {
  type: 'matching'
  pairs: MatchingPair[]
}

type QuizData = {
  id: string
  title: string
  questions: MCQuestion[] | [MatchingBlock]
  totalQuestions: number
  vocabularyList?: { name: string }
}

type ResultData = {
  score: number
  correctCount: number
  totalQuestions: number
  percentage: number
}

// ─── Multiple Choice Component ───────────────────────────────────────────────

function MultipleChoiceQuiz({
  questions,
  onFinish,
}: {
  questions: MCQuestion[]
  onFinish: (answers: Record<string, string>, seconds: number) => void
}) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState(false)
  const startRef = useRef(Date.now())

  const q = questions[idx]
  const total = questions.length

  function choose(choice: string) {
    if (revealed) return
    setSelected(choice)
    setRevealed(true)
    setAnswers(prev => ({ ...prev, [q.id]: choice }))
  }

  function next() {
    if (idx + 1 >= total) {
      const elapsed = Math.round((Date.now() - startRef.current) / 1000)
      onFinish({ ...answers }, elapsed)
    } else {
      setIdx(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  function choiceStyle(choice: string) {
    if (!revealed) {
      return 'bg-white border-2 border-gray-200 text-gray-900 hover:border-red-400 hover:bg-red-50 active:scale-95'
    }
    if (choice === q.correctAnswer) return 'bg-green-50 border-2 border-green-500 text-green-800'
    if (choice === selected) return 'bg-red-50 border-2 border-red-400 text-red-700'
    return 'bg-white border-2 border-gray-200 text-gray-400'
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Question {idx + 1} of {total}</span>
          <span>{Math.round(((idx) / total) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-red-600 rounded-full transition-all duration-300"
            style={{ width: `${((idx) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4 text-center">
        <p className="text-5xl font-bold text-gray-900 mb-2">{q.character}</p>
        <p className="text-gray-400 text-sm">{q.pinyin}</p>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        {q.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => choose(choice)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[52px] ${choiceStyle(choice)}`}
          >
            <span className="font-bold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>
            {choice}
          </button>
        ))}
      </div>

      {revealed && (
        <button
          onClick={next}
          className="w-full bg-red-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-red-700 transition-colors mt-auto"
        >
          {idx + 1 >= total ? 'See Results →' : 'Next →'}
        </button>
      )}
    </div>
  )
}

// ─── Matching Game Component ──────────────────────────────────────────────────

function MatchingGame({
  pairs,
  onFinish,
}: {
  pairs: MatchingPair[]
  onFinish: (answers: Record<string, string>, seconds: number) => void
}) {
  const startRef = useRef(Date.now())
  const [selectedChar, setSelectedChar] = useState<string | null>(null) // pair id
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null) // meaning string
  const [matched, setMatched] = useState<Record<string, string>>({}) // id -> meaning
  const [wrong, setWrong] = useState<{ charId: string; meaning: string } | null>(null)

  // Shuffle meanings once on mount
  const [shuffledMeanings] = useState(() =>
    [...pairs].sort(() => Math.random() - 0.5).map(p => p.meaning)
  )

  const matchedIds = new Set(Object.keys(matched))
  const matchedMeanings = new Set(Object.values(matched))
  const allDone = matchedIds.size === pairs.length

  useEffect(() => {
    if (allDone) {
      const elapsed = Math.round((Date.now() - startRef.current) / 1000)
      setTimeout(() => onFinish(matched, elapsed), 500)
    }
  }, [allDone]) // eslint-disable-line

  function selectChar(id: string) {
    if (matchedIds.has(id)) return
    setSelectedChar(id)
    setWrong(null)
    if (selectedMeaning) tryMatch(id, selectedMeaning)
  }

  function selectMeaning(meaning: string) {
    if (matchedMeanings.has(meaning)) return
    setSelectedMeaning(meaning)
    setWrong(null)
    if (selectedChar) tryMatch(selectedChar, meaning)
  }

  function tryMatch(charId: string, meaning: string) {
    const pair = pairs.find(p => p.id === charId)
    if (pair?.meaning === meaning) {
      setMatched(prev => ({ ...prev, [charId]: meaning }))
      setSelectedChar(null)
      setSelectedMeaning(null)
    } else {
      setWrong({ charId, meaning })
      setTimeout(() => {
        setSelectedChar(null)
        setSelectedMeaning(null)
        setWrong(null)
      }, 600)
    }
  }

  function charStyle(id: string) {
    if (matchedIds.has(id)) return 'bg-green-50 border-green-500 text-green-800 opacity-60'
    if (wrong?.charId === id) return 'bg-red-50 border-red-400 text-red-700'
    if (selectedChar === id) return 'bg-red-600 border-red-600 text-white'
    return 'bg-white border-gray-200 text-gray-900 hover:border-red-400'
  }

  function meaningStyle(meaning: string) {
    if (matchedMeanings.has(meaning)) return 'bg-green-50 border-green-500 text-green-800 opacity-60'
    if (wrong?.meaning === meaning) return 'bg-red-50 border-red-400 text-red-700'
    if (selectedMeaning === meaning) return 'bg-red-600 border-red-600 text-white'
    return 'bg-white border-gray-200 text-gray-900 hover:border-red-400'
  }

  return (
    <div>
      <div className="flex justify-between text-sm text-gray-500 mb-4">
        <span>Match {matchedIds.size} / {pairs.length}</span>
        <span>Tap a character, then its meaning</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Characters column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 text-center mb-2">Chinese</p>
          {pairs.map(pair => (
            <button
              key={pair.id}
              onClick={() => selectChar(pair.id)}
              disabled={matchedIds.has(pair.id)}
              className={`w-full border-2 rounded-xl py-3 px-2 text-center transition-all min-h-[56px] ${charStyle(pair.id)}`}
            >
              <span className="text-xl font-bold block">{pair.character}</span>
              <span className="text-xs text-current opacity-70">{pair.pinyin}</span>
            </button>
          ))}
        </div>

        {/* Meanings column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 text-center mb-2">English</p>
          {shuffledMeanings.map((meaning, i) => (
            <button
              key={i}
              onClick={() => selectMeaning(meaning)}
              disabled={matchedMeanings.has(meaning)}
              className={`w-full border-2 rounded-xl py-3 px-2 text-center transition-all min-h-[56px] text-sm ${meaningStyle(meaning)}`}
            >
              {meaning}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  result,
  quizId,
  onRetry,
}: {
  result: ResultData
  quizId: string
  onRetry: () => void
}) {
  const router = useRouter()
  const emoji =
    result.percentage >= 90 ? '🎉' :
    result.percentage >= 70 ? '👏' :
    result.percentage >= 50 ? '📚' : '💪'

  return (
    <div className="text-center py-4">
      <div className="text-6xl mb-4">{emoji}</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">
        {result.percentage}%
      </h2>
      <p className="text-gray-500 mb-6">
        {result.correctCount} of {result.totalQuestions} correct
      </p>

      <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ${
            result.percentage >= 70 ? 'bg-green-500' :
            result.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${result.percentage}%` }}
        />
      </div>

      <p className="text-sm text-gray-500 mb-8">
        {result.percentage === 100 ? 'Perfect score! 🌟' :
         result.percentage >= 80 ? 'Excellent work!' :
         result.percentage >= 60 ? 'Good job, keep practicing!' :
         'Keep studying and try again!'}
      </p>

      <div className="space-y-3">
        <button
          onClick={onRetry}
          className="w-full bg-red-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-red-700 transition-colors"
        >
          🔄 Try Again
        </button>
        <button
          onClick={() => router.push('/quizzes')}
          className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold text-sm hover:bg-gray-200 transition-colors"
        >
          ← Back to Quizzes
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ResultData | null>(null)
  const [key, setKey] = useState(0) // used to reset quiz

  useEffect(() => {
    fetch(`/api/quizzes/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setQuiz(data.data)
        else setError(data.error)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load quiz')
        setLoading(false)
      })
  }, [id])

  async function submitAnswers(answers: Record<string, string>, timeSpentSeconds: number) {
    try {
      const res = await fetch(`/api/quizzes/${id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAnswers: answers, timeSpentSeconds }),
      })
      const data = await res.json()
      if (data.success) setResult(data.data)
    } catch {
      setError('Failed to save results')
    }
  }

  function retry() {
    setResult(null)
    setKey(k => k + 1)
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

  if (error || !quiz) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <p className="text-red-600 mb-4">{error || 'Quiz not found'}</p>
          <a href="/quizzes" className="text-red-600 underline text-sm">← Back to Quizzes</a>
        </div>
      </Layout>
    )
  }

  const isMatching = Array.isArray(quiz.questions) &&
    quiz.questions.length > 0 &&
    (quiz.questions as unknown[])[0] != null &&
    typeof (quiz.questions as unknown[])[0] === 'object' &&
    ((quiz.questions as Array<{ type?: string }>)[0]).type === 'matching'

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/quizzes" className="text-gray-400 hover:text-gray-600 text-xl">←</a>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{quiz.title}</h1>
            {quiz.vocabularyList && (
              <p className="text-xs text-gray-400">{quiz.vocabularyList.name}</p>
            )}
          </div>
        </div>

        {result ? (
          <ResultsScreen result={result} quizId={id} onRetry={retry} />
        ) : isMatching ? (
          <MatchingGame
            key={key}
            pairs={(quiz.questions as [MatchingBlock])[0].pairs}
            onFinish={submitAnswers}
          />
        ) : (
          <MultipleChoiceQuiz
            key={key}
            questions={quiz.questions as MCQuestion[]}
            onFinish={submitAnswers}
          />
        )}
      </div>
    </Layout>
  )
}
