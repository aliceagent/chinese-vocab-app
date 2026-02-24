import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const quizzes = await prisma.quiz.findMany({
      where: { userId: session.user.id },
      include: {
        quizAttempts: {
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
        vocabularyList: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ success: true, data: quizzes })
  } catch (error) {
    console.error('Error fetching quizzes:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}
