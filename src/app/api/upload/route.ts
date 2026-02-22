import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import pdf from 'pdf-parse'
import OpenAI from 'openai'

const UPLOAD_DIR = '/tmp/chinese-vocab-uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Validate file type
function validateFileType(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx']
  const ext = path.extname(filename).toLowerCase()
  return allowedExtensions.includes(ext)
}

// Get file type from filename
function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    await ensureUploadDir()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!validateFileType(file.name)) {
      return NextResponse.json(
        { success: false, error: 'File type not supported. Please upload PDF, DOC, DOCX, or TXT files.' },
        { status: 400 }
      )
    }

    // Generate unique filename and storage key
    const uploadId = randomUUID()
    const fileExtension = path.extname(file.name)
    const storageKey = `${uploadId}${fileExtension}`
    const filePath = path.join(UPLOAD_DIR, storageKey)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create database record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        id: uploadId,
        userId: session.user.id,
        originalFilename: file.name,
        fileSize: file.size,
        fileType: getFileType(file.name),
        storageKey,
        processingStatus: 'pending'
      }
    })

    // Start background processing
    processFileInBackground(uploadId, filePath, file.name, session.user.id)

    return NextResponse.json({
      success: true,
      data: fileUpload,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    )
  }
}

// Background processing function
async function processFileInBackground(uploadId: string, filePath: string, originalFilename: string, userId: string) {
  try {
    // Update status to processing
    await prisma.fileUpload.update({
      where: { id: uploadId },
      data: { processingStatus: 'processing' }
    })

    // Broadcast processing start via WebSocket (if connected)
    broadcastToWebSocket(uploadId, {
      type: 'processing_start',
      uploadId,
      filename: originalFilename
    })

    // Step 1: Extract text from PDF
    broadcastToWebSocket(uploadId, {
      type: 'processing_progress',
      progress: 0.2,
      message: 'Reading PDF file...'
    })

    let extractedText = ''
    
    if (originalFilename.toLowerCase().endsWith('.pdf')) {
      try {
        const fs = require('fs')
        const fileBuffer = fs.readFileSync(filePath)
        const data = await pdf(fileBuffer)
        extractedText = data.text
        
        console.log(`Extracted ${extractedText.length} characters from PDF`)
      } catch (error) {
        console.error('PDF extraction error:', error)
        throw new Error('Failed to extract text from PDF')
      }
    } else {
      // For other file types, read as text
      const fs = require('fs')
      extractedText = fs.readFileSync(filePath, 'utf8')
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text extracted from file')
    }

    // Step 2: Use OpenAI to extract Chinese vocabulary
    broadcastToWebSocket(uploadId, {
      type: 'processing_progress',
      progress: 0.5,
      message: 'Extracting Chinese vocabulary...'
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a Chinese language expert. Extract all Chinese vocabulary from the provided text. Return only a valid JSON array with no other text or explanation."
        },
        {
          role: "user",
          content: `Extract all Chinese vocabulary from these lesson notes. Return a JSON array only, no other text:
[{"hanzi": "汉字", "pinyin": "pīnyīn", "english": "English meaning"}]
Include all Chinese words, phrases, and vocabulary. If pinyin is given in the notes, use it exactly. If not provided, add the correct pinyin.

Text to process:
${extractedText.slice(0, 8000)}`  // Limit to avoid token limits
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    let vocabularyItems = []
    
    try {
      const responseText = completion.choices[0].message.content?.trim() || ''
      console.log('OpenAI response:', responseText.slice(0, 200) + '...')
      
      // Clean up the response - remove any markdown or extra text
      const jsonMatch = responseText.match(/\[.*\]/s)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText
      
      vocabularyItems = JSON.parse(jsonText)
      console.log(`Extracted ${vocabularyItems.length} vocabulary items`)
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      throw new Error('Failed to extract vocabulary from text')
    }

    // Step 3: Create vocabulary list
    broadcastToWebSocket(uploadId, {
      type: 'processing_progress',
      progress: 0.7,
      message: 'Creating vocabulary list...'
    })

    const vocabularyList = await prisma.vocabularyList.create({
      data: {
        id: randomUUID(),
        userId: userId,
        name: `Vocabulary from ${originalFilename}`,
        description: `Extracted vocabulary from uploaded file: ${originalFilename}`,
        sourceFileName: originalFilename,
        totalWords: vocabularyItems.length,
        hskDistribution: {
          hsk1: 0,
          hsk2: 0,
          hsk3: 0,
          hsk4: 0,
          hsk5: 0,
          hsk6: 0
        }
      }
    })

    // Step 4: Save individual vocabulary items
    broadcastToWebSocket(uploadId, {
      type: 'processing_progress',
      progress: 0.9,
      message: 'Saving vocabulary items...'
    })

    for (const item of vocabularyItems) {
      if (item.hanzi && typeof item.hanzi === 'string') {
        try {
          await prisma.vocabularyItem.create({
            data: {
              id: randomUUID(),
              vocabularyListId: vocabularyList.id,
              simplified: item.hanzi,
              traditional: item.traditional || null,
              pinyin: item.pinyin || null,
              englishDefinitions: [item.english || 'No definition'],
              hskLevel: null, // Could be determined later
              frequencyScore: 0,
              partOfSpeech: null,
              exampleSentences: [],
              userNotes: null,
              masteryLevel: 0
            }
          })
        } catch (error) {
          console.error('Failed to save vocabulary item:', item, error)
          // Continue with other items
        }
      }
    }

    // Update file upload record
    const updatedUpload = await prisma.fileUpload.update({
      where: { id: uploadId },
      data: {
        processingStatus: 'completed',
        vocabularyListId: vocabularyList.id,
        processedAt: new Date()
      }
    })

    // Broadcast completion
    broadcastToWebSocket(uploadId, {
      type: 'processing_complete',
      upload: updatedUpload,
      vocabularyList
    })

  } catch (error) {
    console.error('Processing error:', error)
    
    // Update status to failed
    await prisma.fileUpload.update({
      where: { id: uploadId },
      data: {
        processingStatus: 'failed',
        processingError: error instanceof Error ? error.message : 'Processing failed'
      }
    })

    // Broadcast error
    broadcastToWebSocket(uploadId, {
      type: 'processing_error',
      error: error instanceof Error ? error.message : 'Processing failed'
    })
  }
}

// WebSocket broadcast (placeholder - would need WebSocket server setup)
function broadcastToWebSocket(uploadId: string, data: any) {
  // In a real implementation, you would:
  // 1. Keep track of WebSocket connections by uploadId
  // 2. Send the data to connected clients
  console.log(`WebSocket broadcast for ${uploadId}:`, data)
  
  // For now, store the data in a simple in-memory store
  // that the WebSocket endpoint can poll
  if (typeof global !== 'undefined') {
    if (!global.uploadProgress) {
      global.uploadProgress = new Map()
    }
    global.uploadProgress.set(uploadId, data)
  }
}