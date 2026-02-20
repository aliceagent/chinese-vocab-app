import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

interface AddWordRequest {
  vocabularyListId: string
  simplified: string
  traditional?: string
  pinyin?: string
  englishDefinitions: string[]
  hskLevel?: number
  partOfSpeech?: string
  exampleSentences?: string[]
  userNotes?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: AddWordRequest = await request.json()
    const {
      vocabularyListId,
      simplified,
      traditional,
      pinyin,
      englishDefinitions,
      hskLevel,
      partOfSpeech,
      exampleSentences = [],
      userNotes
    } = body

    // Validate required fields
    if (!vocabularyListId || !simplified || !englishDefinitions || englishDefinitions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: vocabularyListId, simplified, englishDefinitions' },
        { status: 400 }
      )
    }

    // Verify the vocabulary list exists and belongs to the user
    const vocabularyList = await prisma.vocabularyList.findFirst({
      where: {
        id: vocabularyListId,
        userId: session.user.id
      }
    })

    if (!vocabularyList) {
      return NextResponse.json(
        { error: 'Vocabulary list not found or access denied' },
        { status: 404 }
      )
    }

    // Check if word already exists in this list
    const existingWord = await prisma.vocabularyItem.findFirst({
      where: {
        vocabularyListId,
        simplified
      }
    })

    if (existingWord) {
      return NextResponse.json(
        { error: 'Word already exists in this vocabulary list' },
        { status: 409 }
      )
    }

    // Create the vocabulary item
    const vocabularyItem = await prisma.vocabularyItem.create({
      data: {
        vocabularyListId,
        simplified,
        traditional,
        pinyin,
        englishDefinitions,
        hskLevel,
        partOfSpeech,
        exampleSentences,
        userNotes,
        frequencyScore: 0,
        masteryLevel: 0
      }
    })

    // Update vocabulary list word count
    await prisma.vocabularyList.update({
      where: { id: vocabularyListId },
      data: {
        totalWords: {
          increment: 1
        }
      }
    })

    return NextResponse.json({
      success: true,
      vocabularyItem,
      message: 'Word added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding vocabulary word:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve words from a vocabulary list
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const vocabularyListId = searchParams.get('vocabularyListId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    if (!vocabularyListId) {
      return NextResponse.json(
        { error: 'vocabularyListId parameter is required' },
        { status: 400 }
      )
    }

    // Verify the vocabulary list exists and belongs to the user
    const vocabularyList = await prisma.vocabularyList.findFirst({
      where: {
        id: vocabularyListId,
        userId: session.user.id
      }
    })

    if (!vocabularyList) {
      return NextResponse.json(
        { error: 'Vocabulary list not found or access denied' },
        { status: 404 }
      )
    }

    // Get vocabulary items with pagination
    const [vocabularyItems, totalCount] = await Promise.all([
      prisma.vocabularyItem.findMany({
        where: { vocabularyListId },
        orderBy: [
          { hskLevel: 'asc' },
          { simplified: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.vocabularyItem.count({
        where: { vocabularyListId }
      })
    ])

    return NextResponse.json({
      success: true,
      vocabularyItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching vocabulary words:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}