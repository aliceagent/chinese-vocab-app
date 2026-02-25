'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import FlashCard from './FlashCard'

interface VocabItem {
  id: string
  simplified: string
  traditional: string | null
  pinyin: string | null
  englishDefinitions: string[]
  hskLevel: number | null
}

interface CardState {
  wordId: string
  interval: number
  repetitions: number
  easeFactor: number
  nextReview: number
  lastQuality: number
}

interface SessionSummary {
  total: number
  hard: number
  good: number
  easy: number
  nextDue: number | null
}

type RatingQuality = 1 | 3 | 5
type Mode = 'zh-en' | 'en-zh'

function sm2(card: CardState, quality: RatingQuality): CardState {
  const ef = Math.max(1.3, card.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  let interval: number
  let repetitions: number

  if (quality < 3) {
    interval = 1
    repetitions = 0
  } else {
    repetitions = card.repetitions + 1
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 6
    else interval = Math.round(card.interval * ef)
  }

  return {
    ...card,
    interval,
    repetitions,
    easeFactor: ef,
    nextReview: Date.now() + interval * 24 * 60 * 60 * 1000,
    lastQuality: quality,
  }
}

function defaultCardState(wordId: string): CardState {
  return { wordId, interval: 0, repetitions: 0, easeFactor: 2.5, nextReview: 0, lastQuality: 0 }
}

const MAX_NEW_PER_SESSION = 20

interface FlashcardDeckProps {
  listId: string
  listName: string
  items: VocabItem[]
  mode: Mode
}

export default function FlashcardDeck({ listId, listName, items, mode }: FlashcardDeckProps) {
  const router = useRouter()
  const storageKey = `flashcards-${mode}-${listId}`

  const loadStates = useCallback((): Record<string, CardState> => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }, [storageKey])

  const [cardStates, setCardStates] = useState<Record<string, CardState>>(loadStates)
  const [showPinyin, setShowPinyin] = useState(false)

  const buildQueue = useCallback((states: Record<string, CardState>): VocabItem[] => {
    const now = Date.now()
    const due: VocabItem[] = []
    const newCards: VocabItem[] = []
    for (const item of items) {
      const state = states[item.id]
      if (!state) newCards.push(item)
      else if (state.nextReview <= now) due.push(item)
    }
    return [...due, ...newCards.slice(0, MAX_NEW_PER_SESSION)]
  }, [items])

  const [queue, setQueue] = useState<VocabItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionStats, setSessionStats] = useState({ hard: 0, good: 0, easy: 0 })
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  useEffect(() => {
    const states = loadStates()
    setCardStates(states)
    setQueue(buildQueue(states))
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionStats({ hard: 0, good: 0, easy: 0 })
    setSummary(null)
    setShowPinyin(false)
  }, [storageKey, loadStates, buildQueue])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(cardStates))
    }
  }, [cardStates, storageKey])

  const currentCard = queue[currentIndex]

  function handleRating(quality: RatingQuality) {
    if (!currentCard) return
    const existing = cardStates[currentCard.id] ?? defaultCardState(currentCard.id)
    const updated = sm2(existing, quality)
    const newStates = { ...cardStates, [currentCard.id]: updated }
    setCardStates(newStates)

    const label = quality === 1 ? 'hard' : quality === 3 ? 'good' : 'easy'
    const newStats = { ...sessionStats, [label]: sessionStats[label] + 1 }
    setSessionStats(newStats)

    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      const futureReviews = Object.values(newStates)
        .map(s => s.nextReview).filter(t => t > Date.now()).sort((a, b) => a - b)
      setSummary({
        total: queue.length,
        hard: newStats.hard,
        good: newStats.good,
        easy: newStats.easy,
        nextDue: futureReviews[0] ?? null,
      })
    } else {
      setCurrentIndex(nextIndex)
      setIsFlipped(false)
      setShowPinyin(false)
    }
  }

  function handleShuffle() {
    setQueue(q => [...q].sort(() => Math.random() - 0.5))
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowPinyin(false)
  }

  function handleRestart() {
    const states = loadStates()
    setCardStates(states)
    setQueue(buildQueue(states))
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionStats({ hard: 0, good: 0, easy: 0 })
    setSummary(null)
    setShowPinyin(false)
  }

  function handleResetProgress() {
    localStorage.removeItem(storageKey)
    setCardStates({})
    setQueue(items.slice(0, MAX_NEW_PER_SESSION))
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionStats({ hard: 0, good: 0, easy: 0 })
    setSummary(null)
    setShowPinyin(false)
  }

  function switchMode(newMode: Mode) {
    router.push(`/vocabulary/${listId}/flashcards?mode=${newMode}`)
  }

  // ── Mode toggle bar (shared) ──
  const ModeToggle = () => (
    <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm font-medium w-fit mx-auto mb-6">
      <button
        onClick={() => switchMode('zh-en')}
        className={`px-4 py-2 transition-colors ${mode === 'zh-en' ? 'bg-red-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      >
        Chinese → English
      </button>
      <button
        onClick={() => switchMode('en-zh')}
        className={`px-4 py-2 transition-colors ${mode === 'en-zh' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      >
        English → Chinese
      </button>
    </div>
  )

  // ── No cards due ──
  if (queue.length === 0 && !summary) {
    const allStates = cardStates
    const next = Object.values(allStates).map(s => s.nextReview).filter(t => t > Date.now()).sort((a, b) => a - b)[0]
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <ModeToggle />
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h2>
        <p className="text-gray-500 mb-2">No cards due for this mode right now.</p>
        {next && <p className="text-sm text-gray-400 mb-6">Next review: {new Date(next).toLocaleString()}</p>}
        <div className="flex flex-col gap-3">
          <Link href={`/vocabulary/${listId}`} className="inline-flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-colors">
            ← Back to list
          </Link>
          <button onClick={handleResetProgress} className="text-sm text-gray-400 hover:text-red-500 underline transition-colors">
            Reset progress for this mode
          </button>
        </div>
      </div>
    )
  }

  // ── Session summary ──
  if (summary) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <ModeToggle />
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Session complete!</h2>
        <p className="text-gray-500 mb-6">{summary.total} cards reviewed</p>
        <div className="flex justify-center gap-6 mb-8">
          <div><p className="text-2xl font-bold text-red-500">{summary.hard}</p><p className="text-xs text-gray-400 mt-1">😓 Hard</p></div>
          <div><p className="text-2xl font-bold text-yellow-500">{summary.good}</p><p className="text-xs text-gray-400 mt-1">🤔 Good</p></div>
          <div><p className="text-2xl font-bold text-green-500">{summary.easy}</p><p className="text-xs text-gray-400 mt-1">😊 Easy</p></div>
        </div>
        {summary.nextDue && (
          <p className="text-sm text-gray-400 mb-6">Next review: {new Date(summary.nextDue).toLocaleString()}</p>
        )}
        <div className="flex flex-col gap-3">
          <button onClick={handleRestart} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
            Study again
          </button>
          <Link href={`/vocabulary/${listId}`} className="inline-flex justify-center items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-colors">
            ← Back to list
          </Link>
        </div>
      </div>
    )
  }

  // ── Main study view ──
  const progress = Math.round((currentIndex / queue.length) * 100)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href={`/vocabulary/${listId}`} className="inline-flex items-center text-gray-500 hover:text-gray-800 text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {listName}
        </Link>
        <div className="flex gap-2">
          <button onClick={handleShuffle} title="Shuffle" className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">🔀</button>
          <button onClick={handleRestart} title="Restart" className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">🔄</button>
        </div>
      </div>

      {/* Mode toggle */}
      <ModeToggle />

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
        <div className="bg-red-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      {currentCard && (
        <FlashCard
          item={currentCard}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(f => !f)}
          cardNum={currentIndex + 1}
          totalCards={queue.length}
          mode={mode}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin(p => !p)}
        />
      )}

      {/* Rating buttons — only after flip */}
      <div className={`mt-8 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <p className="text-center text-xs text-gray-400 mb-3">How well did you know it?</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => handleRating(1)} className="flex-1 max-w-[110px] bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 px-3 py-3 rounded-xl text-sm font-medium transition-all">
            😓 Hard
          </button>
          <button onClick={() => handleRating(3)} className="flex-1 max-w-[110px] bg-yellow-50 hover:bg-yellow-400 text-yellow-600 hover:text-white border border-yellow-200 hover:border-yellow-400 px-3 py-3 rounded-xl text-sm font-medium transition-all">
            🤔 Good
          </button>
          <button onClick={() => handleRating(5)} className="flex-1 max-w-[110px] bg-green-50 hover:bg-green-500 text-green-600 hover:text-white border border-green-200 hover:border-green-500 px-3 py-3 rounded-xl text-sm font-medium transition-all">
            😊 Easy
          </button>
        </div>
      </div>

      {/* Flip hint */}
      {!isFlipped && (
        <div className="mt-8 text-center">
          <button onClick={() => setIsFlipped(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Flip card
          </button>
        </div>
      )}
    </div>
  )
}
