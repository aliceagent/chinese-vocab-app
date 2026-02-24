import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
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

    // Verify list belongs to user
    const list = await prisma.vocabularyList.findFirst({
      where: { id: vocabularyListId, userId: session.user.id },
    })
    if (!list) {
      return NextResponse.json({ success: false, error: 'Vocabulary list not found' }, { status: 404 })
    }

    // Fetch vocab items
    const items = await prisma.vocabularyItem.findMany({
      where: { vocabularyListId },
      select: { id: true, simplified: true, pinyin: true, englishDefinitions: true },
    })

    if (items.length < 4) {
      return NextResponse.json({
        success: false,
        error: 'Need at least 4 vocabulary items to generate a quiz',
      }, { status: 400 })
    }

    // Filter to items that have at least one English definition
    const validItems = items.filter(i => i.englishDefinitions.length > 0)
    if (validItems.length < 4) {
      return NextResponse.json({
        success: false,
        error: 'Need at least 4 items with English definitions',
      }, { status: 400 })
    }

    const count = Math.min(questionCount, validItems.length)
    const selected = shuffle(validItems).slice(0, count)

    let questions: unknown[]

    if (quizType === 'multiple-choice') {
      questions = selected.map((item) => {
        const correctAnswer = item.englishDefinitions[0]
        // Pick 3 wrong answers from other items
        const others = validItems.filter(i => i.id !== item.id)
        const wrongChoices = shuffle(others)
          .slice(0, 3)
          .map(i => i.englishDefinitions[0])
        const choices = shuffle([correctAnswer, ...wrongChoices])
        return {
          id: item.id,
          type: 'multiple-choice',
          character: item.simplified,
          pinyin: item.pinyin ?? '',
          correctAnswer,
          choices,
        }
      })
    } else if (quizType === 'matching') {
      const pairs = selected.slice(0, 10).map(item => ({
        id: item.id,
        character: item.simplified,
        pinyin: item.pinyin ?? '',
        meaning: item.englishDefinitions[0],
      }))
      questions = [{ type: 'matching', pairs }]
    } else {
      return NextResponse.json({ success: false, error: 'Invalid quizType' }, { status: 400 })
    }

    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        vocabularyListId,
        title: `${list.name} — ${quizType === 'matching' ? 'Matching' : 'Multiple Choice'}`,
        questions: questions as never,
        totalQuestions: quizType === 'matching' ? selected.slice(0, 10).length : selected.length,
      },
    })

    return NextResponse.json({ success: true, data: { quizId: quiz.id, quizType, questions } })
  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate quiz' }, { status: 500 })
  }
}
