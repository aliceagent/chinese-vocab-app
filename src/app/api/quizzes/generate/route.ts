import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type VocabItem = {
  id: string
  simplified: string
  pinyin: string | null
  englishDefinitions: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildMCQuestions(selected: VocabItem[], pool: VocabItem[]) {
  return selected.map((item) => {
    const correctAnswer = item.englishDefinitions[0]
    const others = pool.filter(i => i.id !== item.id)
    const wrongChoices = shuffle(others).slice(0, 3).map(i => i.englishDefinitions[0])
    const choices = shuffle([correctAnswer, ...wrongChoices])
    return {
      id: item.id,
      type: 'multiple-choice' as const,
      character: item.simplified,
      pinyin: item.pinyin ?? '',
      correctAnswer,
      choices,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { vocabularyListId, quizType = 'multiple-choice', questionCount = 10 } = body

    if (!vocabularyListId) {
      return NextResponse.json({ success: false, error: 'vocabularyListId is required' }, { status: 400 })
    }

    console.log('[quiz/generate] step1: userId=', session.user.id, 'listId=', vocabularyListId)
    const list = await prisma.vocabularyList.findFirst({
      where: { id: vocabularyListId, userId: session.user.id },
    })
    if (!list) {
      console.log('[quiz/generate] list not found')
      return NextResponse.json({ success: false, error: 'Vocabulary list not found' }, { status: 404 })
    }

    console.log('[quiz/generate] step2: list found:', list.name)
    const items = await prisma.vocabularyItem.findMany({
      where: { vocabularyListId },
      select: { id: true, simplified: true, pinyin: true, englishDefinitions: true },
    })

    console.log('[quiz/generate] step3: items count:', items.length)
    if (items.length < 4) {
      return NextResponse.json({
        success: false,
        error: `Need at least 4 vocabulary items (got ${items.length})`,
      }, { status: 400 })
    }

    const pool = items.filter(i => Array.isArray(i.englishDefinitions) && i.englishDefinitions.length > 0)
    console.log('[quiz/generate] step4: pool size:', pool.length)
    if (pool.length < 4) {
      return NextResponse.json({
        success: false,
        error: `Need at least 4 items with English definitions (got ${pool.length} of ${items.length})`,
      }, { status: 400 })
    }

    let questions: unknown[]
    let totalQuestions: number
    let title: string

    if (quizType === 'multiple-choice') {
      const count = Math.min(questionCount, pool.length)
      const selected = shuffle(pool).slice(0, count)
      questions = buildMCQuestions(selected, pool)
      totalQuestions = selected.length
      title = `${list.name} — Multiple Choice`

    } else if (quizType === 'matching') {
      const selected = shuffle(pool).slice(0, Math.min(10, pool.length))
      const pairs = selected.map(item => ({
        id: item.id,
        character: item.simplified,
        pinyin: item.pinyin ?? '',
        meaning: item.englishDefinitions[0],
      }))
      questions = [{ type: 'matching', pairs }]
      totalQuestions = selected.length
      title = `${list.name} — Matching`

    } else if (quizType === 'speed-round') {
      const count = Math.min(30, pool.length)
      const selected = shuffle(pool).slice(0, count)
      const mcQuestions = buildMCQuestions(selected, pool)
      questions = [{ type: 'speed-round', questions: mcQuestions, durationSeconds: 60 }]
      totalQuestions = mcQuestions.length
      title = `${list.name} — Speed Round ⚡`

    } else if (quizType === 'match-attack') {
      const count = Math.min(30, pool.length)
      const selected = shuffle(pool).slice(0, count)
      const pairs = selected.map(item => ({
        id: item.id,
        character: item.simplified,
        pinyin: item.pinyin ?? '',
        meaning: item.englishDefinitions[0],
      }))
      questions = [{ type: 'match-attack', pairs }]
      totalQuestions = selected.length
      title = `${list.name} — Match Attack 🎯`

    } else {
      return NextResponse.json({ success: false, error: 'Invalid quizType' }, { status: 400 })
    }

    console.log('[quiz/generate] step5: creating quiz, type=', quizType, 'totalQ=', totalQuestions)
    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        vocabularyListId,
        title,
        questions: questions as never,
        totalQuestions,
      },
    })

    console.log('[quiz/generate] step6: quiz created:', quiz.id)
    return NextResponse.json({ success: true, data: { quizId: quiz.id, quizType, questions } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error generating quiz:', msg)
    return NextResponse.json({ success: false, error: `Server error: ${msg}` }, { status: 500 })
  }
}
