import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: quizId } = await params
    const body = await request.json()
    const { userAnswers, timeSpentSeconds } = body

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: session.user.id },
    })
    if (!quiz) {
      return NextResponse.json({ success: false, error: 'Quiz not found' }, { status: 404 })
    }

    // Calculate score
    const questions = quiz.questions as Array<{
      type: string
      correctAnswer?: string
      id?: string
      pairs?: Array<{ id: string; character: string; meaning: string }>
    }>

    let correctCount = 0
    let totalQuestions = quiz.totalQuestions

    if (questions[0]?.type === 'matching') {
      const pairs = questions[0].pairs ?? []
      totalQuestions = pairs.length
      for (const pair of pairs) {
        const answer = (userAnswers as Record<string, string>)[pair.id]
        if (answer === pair.meaning) correctCount++
      }
    } else {
      for (const q of questions) {
        const answer = (userAnswers as Record<string, string>)[q.id ?? '']
        if (answer === q.correctAnswer) correctCount++
      }
      totalQuestions = questions.length
    }

    const score = totalQuestions > 0 ? correctCount / totalQuestions : 0

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: session.user.id,
        userAnswers: userAnswers as never,
        score,
        timeSpentSeconds: timeSpentSeconds ?? null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        score,
        correctCount,
        totalQuestions,
        percentage: Math.round(score * 100),
      },
    })
  } catch (error) {
    console.error('Error saving quiz attempt:', error)
    return NextResponse.json({ success: false, error: 'Failed to save attempt' }, { status: 500 })
  }
}
