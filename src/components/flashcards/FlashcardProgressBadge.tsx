'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CardState {
  repetitions: number
  interval: number
}

interface Props {
  listId: string
  totalItems: number
}

function getPct(key: string, total: number): number {
  if (total === 0) return 0
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return 0
    const states: Record<string, CardState> = JSON.parse(saved)
    const seen = Object.values(states).filter(s => s.repetitions > 0).length
    return Math.round((seen / total) * 100)
  } catch {
    return 0
  }
}

export default function FlashcardProgressBadge({ listId, totalItems }: Props) {
  const [zhEn, setZhEn] = useState<number | null>(null)
  const [enZh, setEnZh] = useState<number | null>(null)

  useEffect(() => {
    setZhEn(getPct(`flashcards-zh-en-${listId}`, totalItems))
    setEnZh(getPct(`flashcards-en-zh-${listId}`, totalItems))
  }, [listId, totalItems])

  // Don't render until hydrated (avoids SSR mismatch)
  if (zhEn === null) return null

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Link
        href={`/vocabulary/${listId}/flashcards?mode=zh-en`}
        className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
      >
        🃏 Chinese → English
        <span className="bg-red-200 text-red-800 text-xs px-1.5 py-0.5 rounded-full font-semibold">
          {zhEn}%
        </span>
      </Link>
      <Link
        href={`/vocabulary/${listId}/flashcards?mode=en-zh`}
        className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
      >
        🃏 English → Chinese
        <span className="bg-blue-200 text-blue-800 text-xs px-1.5 py-0.5 rounded-full font-semibold">
          {enZh}%
        </span>
      </Link>
    </div>
  )
}
