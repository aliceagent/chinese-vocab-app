import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: session.user.id },
      include: {
        vocabularyList: { select: { name: true } },
      },
    })

    if (!quiz) {
      return NextResponse.json({ success: false, error: 'Quiz not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: quiz })
  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch quiz' }, { status: 500 })
  }
}
