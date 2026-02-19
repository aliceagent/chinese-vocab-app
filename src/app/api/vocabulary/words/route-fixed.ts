import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import Database from 'better-sqlite3'
import { join } from 'path'

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
  let db: Database.Database | null = null
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Open SQLite database directly
    const dbPath = join(process.cwd(), 'dev.db')
    db = new Database(dbPath)

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
    const checkListStmt = db.prepare('SELECT id FROM vocabulary_lists WHERE id = ? AND user_id = ?')
    const listExists = checkListStmt.get(vocabularyListId, session.user.id)

    if (!listExists) {
      return NextResponse.json(
        { error: 'Vocabulary list not found or access denied' },
        { status: 404 }
      )
    }

    // Check if word already exists in this list
    const checkWordStmt = db.prepare('SELECT id FROM vocabulary_items WHERE vocabulary_list_id = ? AND simplified = ?')
    const existingWord = checkWordStmt.get(vocabularyListId, simplified)

    if (existingWord) {
      return NextResponse.json(
        { error: 'Word already exists in this vocabulary list' },
        { status: 409 }
      )
    }

    // Generate a simple ID
    const wordId = 'word_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

    // Insert the word
    const insertStmt = db.prepare(`
      INSERT INTO vocabulary_items (
        id, vocabulary_list_id, simplified, traditional, pinyin, 
        english_definitions, hsk_level, part_of_speech, 
        example_sentences, user_notes, frequency_score, 
        mastery_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)

    insertStmt.run(
      wordId,
      vocabularyListId,
      simplified,
      traditional || null,
      pinyin || null,
      JSON.stringify(englishDefinitions),
      hskLevel || null,
      partOfSpeech || null,
      JSON.stringify(exampleSentences),
      userNotes || null,
      0, // frequency_score
      0  // mastery_level
    )

    // Update vocabulary list word count
    const updateCountStmt = db.prepare('UPDATE vocabulary_lists SET total_words = total_words + 1 WHERE id = ?')
    updateCountStmt.run(vocabularyListId)

    // Get the created word
    const getWordStmt = db.prepare('SELECT * FROM vocabulary_items WHERE id = ?')
    const createdWord = getWordStmt.get(wordId)

    const responseItem = {
      ...createdWord,
      englishDefinitions: JSON.parse(createdWord.english_definitions),
      exampleSentences: JSON.parse(createdWord.example_sentences)
    }

    return NextResponse.json({
      success: true,
      vocabularyItem: responseItem,
      message: 'Word added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding vocabulary word:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    if (db) {
      db.close()
    }
  }
}

// GET endpoint to retrieve words from a vocabulary list
export async function GET(request: NextRequest) {
  let db: Database.Database | null = null
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Open SQLite database directly
    const dbPath = join(process.cwd(), 'dev.db')
    db = new Database(dbPath)

    const { searchParams } = new URL(request.url)
    const vocabularyListId = searchParams.get('vocabularyListId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    if (!vocabularyListId) {
      return NextResponse.json(
        { error: 'vocabularyListId parameter is required' },
        { status: 400 }
      )
    }

    // Verify the vocabulary list exists and belongs to the user
    const checkListStmt = db.prepare('SELECT id FROM vocabulary_lists WHERE id = ? AND user_id = ?')
    const listExists = checkListStmt.get(vocabularyListId, session.user.id)

    if (!listExists) {
      return NextResponse.json(
        { error: 'Vocabulary list not found or access denied' },
        { status: 404 }
      )
    }

    // Get vocabulary items with pagination
    const getItemsStmt = db.prepare(`
      SELECT * FROM vocabulary_items 
      WHERE vocabulary_list_id = ? 
      ORDER BY hsk_level ASC, simplified ASC 
      LIMIT ? OFFSET ?
    `)
    const vocabularyItems = getItemsStmt.all(vocabularyListId, limit, offset)

    // Get total count
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM vocabulary_items WHERE vocabulary_list_id = ?')
    const { count: totalCount } = countStmt.get(vocabularyListId) as { count: number }

    // Parse JSON fields back to arrays for response
    const responseItems = vocabularyItems.map(item => ({
      ...item,
      englishDefinitions: JSON.parse(item.english_definitions),
      exampleSentences: JSON.parse(item.example_sentences)
    }))

    return NextResponse.json({
      success: true,
      vocabularyItems: responseItems,
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
  } finally {
    if (db) {
      db.close()
    }
  }
}