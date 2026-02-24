'use client'

import { useEffect, useState, useRef, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/common/Layout'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type MatchingBlock    = { type: 'matching';     pairs: MatchingPair[] }
type SpeedRoundBlock  = { type: 'speed-round';  questions: MCQuestion[]; durationSeconds: number }
type MatchAttackBlock = { type: 'match-attack'; pairs: MatchingPair[] }

type QuizData = {
  id: string
  title: string
  questions: MCQuestion[] | [MatchingBlock] | [SpeedRoundBlock] | [MatchAttackBlock]
  totalQuestions: number
  vocabularyList?: { name: string }
}

type ResultData = {
  score: number
  correctCount: number
  totalQuestions: number
  percentage: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ResultsScreen({
  result,
  onRetry,
  extra,
}: {
  result: ResultData
  onRetry: () => void
  extra?: React.ReactNode
}) {
  const router = useRouter()
  const pct = result.percentage
  const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '👏' : pct >= 50 ? '📚' : '💪'

  return (
    <div className="text-center py-4">
      <div className="text-6xl mb-3">{emoji}</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">{pct}%</h2>
      <p className="text-gray-500 mb-2">{result.correctCount} of {result.totalQuestions} correct</p>
      {extra}
      <div className="w-full bg-gray-100 rounded-full h-3 my-4">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ${
            pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-gray-400 mb-6">
        {pct === 100 ? 'Perfect! 🌟' : pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good job!' : 'Keep practicing!'}
      </p>
      <div className="space-y-3">
        <button onClick={onRetry} className="w-full bg-red-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-red-700 transition-colors">
          🔄 Try Again
        </button>
        <button onClick={() => router.push('/quizzes')} className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold text-sm hover:bg-gray-200 transition-colors">
          ← Back to Quizzes
        </button>
      </div>
    </div>
  )
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoiceQuiz({ questions, onFinish }: {
  questions: MCQuestion[]
  onFinish: (answers: Record<string, string>, seconds: number) => void
}) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState(false)
  const startRef = useRef(Date.now())
  const q = questions[idx]

  function choose(choice: string) {
    if (revealed) return
    setSelected(choice)
    setRevealed(true)
    setAnswers(prev => ({ ...prev, [q.id]: choice }))
  }

  function next() {
    if (idx + 1 >= questions.length) {
      onFinish({ ...answers }, Math.round((Date.now() - startRef.current) / 1000))
    } else {
      setIdx(i => i + 1); setSelected(null); setRevealed(false)
    }
  }

  function choiceStyle(c: string) {
    if (!revealed) return 'bg-white border-2 border-gray-200 text-gray-900 hover:border-red-400 hover:bg-red-50 active:scale-95'
    if (c === q.correctAnswer) return 'bg-green-50 border-2 border-green-500 text-green-800'
    if (c === selected) return 'bg-red-50 border-2 border-red-400 text-red-700'
    return 'bg-white border-2 border-gray-200 text-gray-400'
  }

  return (
    <div>
      <div className="flex justify-between text-sm text-gray-400 mb-1">
        <span>Question {idx + 1} of {questions.length}</span>
        <span>{Math.round((idx / questions.length) * 100)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
        <div className="h-2 bg-red-600 rounded-full transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4 text-center">
        <p className="text-5xl font-bold text-gray-900 mb-1">{q.character}</p>
        <p className="text-gray-400 text-sm">{q.pinyin}</p>
      </div>
      <div className="space-y-2 mb-4">
        {q.choices.map((c, i) => (
          <button key={i} onClick={() => choose(c)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[52px] ${choiceStyle(c)}`}>
            <span className="font-bold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>{c}
          </button>
        ))}
      </div>
      {revealed && (
        <button onClick={next} className="w-full bg-red-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-red-700">
          {idx + 1 >= questions.length ? 'See Results →' : 'Next →'}
        </button>
      )}
    </div>
  )
}

// ─── Matching Game ────────────────────────────────────────────────────────────

function MatchingGame({ pairs, onFinish }: {
  pairs: MatchingPair[]
  onFinish: (answers: Record<string, string>, seconds: number) => void
}) {
  const startRef = useRef(Date.now())
  const [selChar, setSelChar] = useState<string | null>(null)
  const [selMeaning, setSelMeaning] = useState<string | null>(null)
  const [matched, setMatched] = useState<Record<string, string>>({})
  const [wrong, setWrong] = useState<{ charId: string; meaning: string } | null>(null)
  const [shuffled] = useState(() => [...pairs].sort(() => Math.random() - 0.5).map(p => p.meaning))
  const matchedIds = new Set(Object.keys(matched))
  const matchedMeanings = new Set(Object.values(matched))
  const allDone = matchedIds.size === pairs.length

  const doFinish = useCallback((m: Record<string, string>) => {
    const elapsed = Math.round((Date.now() - startRef.current) / 1000)
    setTimeout(() => onFinish(m, elapsed), 400)
  }, [onFinish])

  useEffect(() => { if (allDone) doFinish(matched) }, [allDone, matched, doFinish])

  function tryMatch(charId: string, meaning: string) {
    const pair = pairs.find(p => p.id === charId)
    if (pair?.meaning === meaning) {
      const next = { ...matched, [charId]: meaning }
      setMatched(next)
      setSelChar(null); setSelMeaning(null)
    } else {
      setWrong({ charId, meaning })
      setTimeout(() => { setSelChar(null); setSelMeaning(null); setWrong(null) }, 600)
    }
  }

  function selectChar(id: string) {
    if (matchedIds.has(id)) return
    setSelChar(id); setWrong(null)
    if (selMeaning) tryMatch(id, selMeaning)
  }

  function selectMeaning(m: string) {
    if (matchedMeanings.has(m)) return
    setSelMeaning(m); setWrong(null)
    if (selChar) tryMatch(selChar, m)
  }

  function cs(id: string) {
    if (matchedIds.has(id)) return 'bg-green-50 border-green-400 text-green-700 opacity-50'
    if (wrong?.charId === id) return 'bg-red-50 border-red-400 text-red-700'
    if (selChar === id) return 'bg-red-600 border-red-600 text-white'
    return 'bg-white border-gray-200 text-gray-900 hover:border-red-400'
  }

  function ms(m: string) {
    if (matchedMeanings.has(m)) return 'bg-green-50 border-green-400 text-green-700 opacity-50'
    if (wrong?.meaning === m) return 'bg-red-50 border-red-400 text-red-700'
    if (selMeaning === m) return 'bg-red-600 border-red-600 text-white'
    return 'bg-white border-gray-200 text-gray-900 hover:border-red-400'
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4 text-center">Matched {matchedIds.size} / {pairs.length} — tap a character, then its meaning</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 text-center">Chinese</p>
          {pairs.map(p => (
            <button key={p.id} onClick={() => selectChar(p.id)} disabled={matchedIds.has(p.id)}
              className={`w-full border-2 rounded-xl py-3 px-2 text-center transition-all min-h-[56px] ${cs(p.id)}`}>
              <span className="text-xl font-bold block">{p.character}</span>
              <span className="text-xs opacity-70">{p.pinyin}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 text-center">English</p>
          {shuffled.map((m, i) => (
            <button key={i} onClick={() => selectMeaning(m)} disabled={matchedMeanings.has(m)}
              className={`w-full border-2 rounded-xl py-3 px-2 text-center transition-all min-h-[56px] text-sm ${ms(m)}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Speed Round ──────────────────────────────────────────────────────────────

function SpeedRound({ questions, durationSeconds, onFinish }: {
  questions: MCQuestion[]
  durationSeconds: number
  onFinish: (answers: Record<string, string>, seconds: number, score: number) => void
}) {
  const [idx, setIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [locked, setLocked] = useState(false)
  const answerTimeRef = useRef(Date.now())
  const startRef = useRef(Date.now())

  // Countdown timer
  useEffect(() => {
    if (gameOver) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t)
          setGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [gameOver])

  // End when time runs out
  useEffect(() => {
    if (gameOver) {
      const elapsed = Math.round((Date.now() - startRef.current) / 1000)
      setTimeout(() => onFinish({ ...answers }, elapsed, score), 600)
    }
  }, [gameOver]) // eslint-disable-line

  function choose(choice: string) {
    if (locked || gameOver) return
    setLocked(true)

    const q = questions[idx]
    const correct = choice === q.correctAnswer
    const answerMs = Date.now() - answerTimeRef.current
    const speedBonus = answerMs < 2000 ? 5 : 0

    const newStreak = correct ? streak + 1 : 0
    const streakMultiplier = Math.min(newStreak, 5) // cap at 5x
    const pts = correct ? 10 * Math.max(1, streakMultiplier) + speedBonus : 0

    setAnswers(prev => ({ ...prev, [q.id]: choice }))
    setFlash(correct ? 'correct' : 'wrong')
    if (correct) setStreak(newStreak)
    else setStreak(0)
    setScore(s => s + pts)

    setTimeout(() => {
      setFlash(null)
      setLocked(false)
      answerTimeRef.current = Date.now()
      if (idx + 1 >= questions.length) {
        setGameOver(true)
      } else {
        setIdx(i => i + 1)
      }
    }, 700)
  }

  const q = questions[Math.min(idx, questions.length - 1)]
  const timerPct = (timeLeft / durationSeconds) * 100
  const timerColor = timeLeft > 20 ? 'bg-green-500' : timeLeft > 10 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-400">pts</span>
        </div>
        {streak >= 2 && (
          <span className="text-sm font-bold text-orange-500">🔥 {streak}x streak!</span>
        )}
        <div className="flex items-center gap-1">
          <span className={`text-2xl font-bold tabular-nums ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
            {timeLeft}
          </span>
          <span className="text-xs text-gray-400">s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-1000 ${timerColor}`} style={{ width: `${timerPct}%` }} />
      </div>

      {/* Question card */}
      <div className={`rounded-xl border p-6 mb-4 text-center transition-colors duration-300 ${
        flash === 'correct' ? 'bg-green-50 border-green-300' :
        flash === 'wrong' ? 'bg-red-50 border-red-300' :
        'bg-white border-gray-100'
      }`}>
        <p className="text-5xl font-bold text-gray-900 mb-1">{q.character}</p>
        <p className="text-gray-400 text-sm">{q.pinyin}</p>
        {flash && (
          <p className={`mt-2 text-sm font-semibold ${flash === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
            {flash === 'correct' ? '✓ Correct!' : `✗ ${q.correctAnswer}`}
          </p>
        )}
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {q.choices.map((c, i) => (
          <button
            key={i}
            onClick={() => choose(c)}
            disabled={locked || gameOver}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium bg-white border-2 border-gray-200 text-gray-900 hover:border-red-400 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-60 min-h-[52px]"
          >
            <span className="font-bold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span>{c}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-gray-300 mt-3">{idx + 1} / {questions.length}</p>
    </div>
  )
}

// ─── Match Attack ─────────────────────────────────────────────────────────────

function MatchAttack({ pairs, onFinish }: {
  pairs: MatchingPair[]
  onFinish: (answers: Record<string, string>, seconds: number) => void
}) {
  // Build a shuffled queue of cards — each card shows a character + a meaning (correct or decoy)
  const [cards] = useState(() => {
    const deck: Array<{ pair: MatchingPair; shownMeaning: string; isMatch: boolean }> = []
    const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffledPairs.length; i++) {
      const pair = shuffledPairs[i]
      const isMatch = Math.random() > 0.4 // ~60% chance it's a correct match
      let shownMeaning = pair.meaning
      if (!isMatch) {
        // Pick a different word's meaning as decoy
        const others = shuffledPairs.filter((_, j) => j !== i)
        if (others.length > 0) {
          shownMeaning = others[Math.floor(Math.random() * others.length)].meaning
        } else {
          // fallback: make it a match
          shownMeaning = pair.meaning
        }
      }
      deck.push({ pair, shownMeaning, isMatch: shownMeaning === pair.meaning })
    }
    return deck
  })

  const [idx, setIdx] = useState(0)
  const [lives, setLives] = useState(3)
  const [correct, setCorrect] = useState(0)
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const startRef = useRef(Date.now())

  const doFinish = useCallback((ans: Record<string, string>) => {
    const elapsed = Math.round((Date.now() - startRef.current) / 1000)
    setTimeout(() => onFinish(ans, elapsed), 500)
  }, [onFinish])

  useEffect(() => {
    if (done) doFinish(answers)
  }, [done]) // eslint-disable-line

  function answer(userSaysMatch: boolean) {
    if (flash || done) return
    const card = cards[idx]
    const isRight = userSaysMatch === card.isMatch

    const newAnswers = { ...answers, [card.pair.id]: userSaysMatch ? card.shownMeaning : '__no__' }
    setAnswers(newAnswers)
    setFlash(isRight ? 'correct' : 'wrong')

    const newLives = isRight ? lives : lives - 1
    const newCorrect = isRight ? correct + 1 : correct

    setTimeout(() => {
      setFlash(null)
      if (newLives <= 0) {
        setLives(0)
        setCorrect(newCorrect)
        setDone(true)
        return
      }
      if (idx + 1 >= cards.length) {
        setLives(newLives)
        setCorrect(newCorrect)
        setDone(true)
        return
      }
      setLives(newLives)
      setCorrect(newCorrect)
      setIdx(i => i + 1)
    }, 600)
  }

  if (done) return null // parent handles results

  const card = cards[idx]

  return (
    <div>
      {/* Lives + progress */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-1 text-xl">
          {[...Array(3)].map((_, i) => (
            <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
          ))}
        </div>
        <span className="text-sm text-gray-400">{idx + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div className="h-1.5 bg-red-600 rounded-full transition-all" style={{ width: `${((idx) / cards.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className={`rounded-2xl border-2 p-8 text-center mb-6 transition-colors duration-300 ${
        flash === 'correct' ? 'bg-green-50 border-green-400' :
        flash === 'wrong' ? 'bg-red-50 border-red-400' :
        'bg-white border-gray-100'
      }`}>
        <p className="text-6xl font-bold text-gray-900 mb-2">{card.pair.character}</p>
        <p className="text-gray-400 text-sm mb-5">{card.pair.pinyin}</p>
        <div className="w-full h-px bg-gray-100 mb-5" />
        <p className="text-xl font-semibold text-gray-700">{card.shownMeaning}</p>
        {flash && (
          <p className={`mt-3 text-sm font-bold ${flash === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
            {flash === 'correct' ? '✓ Correct!' : `✗ It means: ${card.pair.meaning}`}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => answer(false)}
          disabled={!!flash}
          className="bg-gray-100 hover:bg-red-50 hover:border-red-300 border-2 border-transparent text-gray-700 rounded-2xl py-5 text-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          ✗
          <span className="block text-xs font-normal text-gray-400 mt-1">No match</span>
        </button>
        <button
          onClick={() => answer(true)}
          disabled={!!flash}
          className="bg-gray-100 hover:bg-green-50 hover:border-green-300 border-2 border-transparent text-gray-700 rounded-2xl py-5 text-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          ✓
          <span className="block text-xs font-normal text-gray-400 mt-1">It matches!</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mt-4">Score: {correct} correct so far</p>
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
  const [speedScore, setSpeedScore] = useState<number | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    fetch(`/api/quizzes/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setQuiz(d.data); else setError(d.error); setLoading(false) })
      .catch(() => { setError('Failed to load quiz'); setLoading(false) })
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
    } catch { setError('Failed to save results') }
  }

  async function submitSpeedRound(answers: Record<string, string>, seconds: number, score: number) {
    setSpeedScore(score)
    await submitAnswers(answers, seconds)
  }

  function retry() { setResult(null); setSpeedScore(null); setKey(k => k + 1) }

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

  // Detect quiz mode
  const firstQ = (quiz.questions as unknown[])[0]
  const quizMode = firstQ && typeof firstQ === 'object'
    ? (firstQ as { type?: string }).type ?? 'multiple-choice'
    : 'multiple-choice'

  function renderQuiz() {
    if (result) {
      return (
        <ResultsScreen
          result={result}
          onRetry={retry}
          extra={speedScore !== null ? (
            <p className="text-2xl font-bold text-orange-500 mb-1">🏆 {speedScore} pts</p>
          ) : undefined}
        />
      )
    }

    switch (quizMode) {
      case 'speed-round': {
        const block = (quiz!.questions as [SpeedRoundBlock])[0]
        return (
          <SpeedRound
            key={key}
            questions={block.questions}
            durationSeconds={block.durationSeconds ?? 60}
            onFinish={submitSpeedRound}
          />
        )
      }
      case 'matching': {
        const block = (quiz!.questions as [MatchingBlock])[0]
        return <MatchingGame key={key} pairs={block.pairs} onFinish={submitAnswers} />
      }
      case 'match-attack': {
        const block = (quiz!.questions as [MatchAttackBlock])[0]
        return <MatchAttack key={key} pairs={block.pairs} onFinish={submitAnswers} />
      }
      default:
        return (
          <MultipleChoiceQuiz
            key={key}
            questions={quiz!.questions as MCQuestion[]}
            onFinish={submitAnswers}
          />
        )
    }
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6 pb-20 sm:pb-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/quizzes" className="text-gray-400 hover:text-gray-600 text-xl">←</a>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">{quiz.title}</h1>
            {quiz.vocabularyList && <p className="text-xs text-gray-400">{quiz.vocabularyList.name}</p>}
          </div>
        </div>
        {renderQuiz()}
      </div>
    </Layout>
  )
}
