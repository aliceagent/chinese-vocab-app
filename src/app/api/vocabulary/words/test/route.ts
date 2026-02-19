import { NextRequest, NextResponse } from 'next/server'
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
    // TEMPORARY: Skip authentication for testing
    const hardcodedUserId = 'test-user-123'

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
        userId: hardcodedUserId
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
        vocabularyListId: vocabularyListId,
        simplified: simplified
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
        traditional: traditional || null,
        pinyin: pinyin || null,
        englishDefinitions: JSON.stringify(englishDefinitions), // Store as JSON string for SQLite
        hskLevel: hskLevel || null,
        partOfSpeech: partOfSpeech || null,
        exampleSentences: JSON.stringify(exampleSentences), // Store as JSON string for SQLite
        userNotes: userNotes || null,
        frequencyScore: 0, // Default value
        masteryLevel: 0    // Default value
      }
    })

    // Update the vocabulary list's total word count
    await prisma.vocabularyList.update({
      where: { id: vocabularyListId },
      data: {
        totalWords: {
          increment: 1
        }
      }
    })

    // Parse JSON fields back to arrays for response
    const responseItem = {
      ...vocabularyItem,
      englishDefinitions: JSON.parse(vocabularyItem.englishDefinitions),
      exampleSentences: JSON.parse(vocabularyItem.exampleSentences)
    }

    return NextResponse.json({
      success: true,
      vocabularyItem: responseItem,
      message: 'Word added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding vocabulary word:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}