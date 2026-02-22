import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Try to get session, but fall back to returning all lists if auth is unavailable
    let userId: string | null = null
    try {
      const session = await getServerSession(authOptions)
      userId = session?.user?.id ?? null
    } catch {
      // Auth not available, return all lists
    }

    const lists = await prisma.vocabularyList.findMany({
      where: userId ? { userId } : undefined,
      include: {
        _count: {
          select: {
            vocabularyItems: true,
            generatedStories: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: lists,
    })
  } catch (error) {
    console.error('Error fetching vocabulary lists:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vocabulary lists' },
      { status: 500 }
    )
  }
}
