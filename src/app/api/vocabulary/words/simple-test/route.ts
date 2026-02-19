import { NextRequest, NextResponse } from 'next/server'
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

    // Check if vocabulary list exists
    const checkListStmt = db.prepare('SELECT id FROM vocabulary_lists WHERE id = ?')
    const listExists = checkListStmt.get(vocabularyListId)

    if (!listExists) {
      return NextResponse.json(
        { error: 'Vocabulary list not found' },
        { status: 404 }
      )
    }

    // Check if word already exists
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
      message: 'Word added successfully - Direct SQLite approach'
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding vocabulary word:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  } finally {
    if (db) {
      db.close()
    }
  }
}