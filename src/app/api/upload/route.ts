import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
// Lazy load OpenAI to avoid bundling issues
let OpenAIClass: any = null
async function getOpenAI() {
  if (!OpenAIClass) {
    OpenAIClass = (await import('openai')).default
  }
  return OpenAIClass
}

const UPLOAD_DIR = '/tmp/chinese-vocab-uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

function validateFileType(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx']
  const ext = path.extname(filename).toLowerCase()
  return allowedExtensions.includes(ext)
}

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
  const tempFilePath: string[] = []

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized - please log in' }, { status: 401 })
    }

    await ensureUploadDir()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 })
    }
    if (!validateFileType(file.name)) {
      return NextResponse.json({ success: false, error: 'File type not supported. Please upload PDF, DOC, DOCX, or TXT files.' }, { status: 400 })
    }

    // Save file to /tmp
    const uploadId = randomUUID()
    const fileExtension = path.extname(file.name)
    const storageKey = `${uploadId}${fileExtension}`
    const filePath = path.join(UPLOAD_DIR, storageKey)
    tempFilePath.push(filePath)

    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Create DB record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        id: uploadId,
        userId: session.user.id,
        originalFilename: file.name,
        fileSize: file.size,
        fileType: getFileType(file.name),
        storageKey,
        processingStatus: 'processing'
      }
    })

    // ── Step 1: Extract text ─────────────────────────────────────────────
    let extractedText = ''
    const ext = fileExtension.toLowerCase()

    if (ext === '.pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs')
      const data = await pdfParse(fs.readFileSync(filePath))
      extractedText = data.text
    } else if (ext === '.docx' || ext === '.doc') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ path: filePath })
      extractedText = result.value
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs')
      extractedText = fs.readFileSync(filePath, 'utf8')
    }

    if (!extractedText?.trim()) {
      throw new Error('No text could be extracted from the file')
    }

    console.log(`Extracted ${extractedText.length} chars from ${file.name}`)

    // ── Step 2: Extract Chinese vocabulary via OpenAI ────────────────────
    const apiKey = process.env.OPENAI_API_KEY
    const OpenAIConstructor = await getOpenAI()
    const openai = new OpenAIConstructor({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a Chinese language expert. Extract all Chinese vocabulary words and phrases from the provided text. Return ONLY a valid JSON array with no other text.'
        },
        {
          role: 'user',
          content: `Extract all Chinese vocabulary from this text. Return a JSON array only:\n[{"hanzi":"汉字","pinyin":"pīnyīn","english":"meaning"}]\n\nText:\n${extractedText.slice(0, 8000)}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    let vocabularyItems: Array<{ hanzi: string; pinyin?: string; english?: string; traditional?: string }> = []
    try {
      const raw = completion.choices[0].message.content?.trim() || ''
      const match = raw.match(/\[[\s\S]*\]/)
      vocabularyItems = JSON.parse(match ? match[0] : raw)
      console.log(`Got ${vocabularyItems.length} vocab items`)
    } catch (e) {
      console.error('Failed to parse OpenAI vocab response:', e)
      throw new Error('Failed to extract vocabulary from text')
    }

    // ── Step 3: Create vocabulary list + items in DB ─────────────────────
    const vocabularyList = await prisma.vocabularyList.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        name: `Vocabulary from ${file.name}`,
        description: `Extracted from: ${file.name}`,
        sourceFileName: file.name,
        totalWords: vocabularyItems.length,
        hskDistribution: {}
      }
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
              englishDefinitions: [item.english || ''],
              hskLevel: null,
              frequencyScore: 0,
              partOfSpeech: null,
              exampleSentences: [],
              userNotes: null,
              masteryLevel: 0
            }
          })
        } catch (err) {
          console.error('Failed to save vocab item:', item, err)
        }
      }
    }

    // ── Step 4: Mark complete ────────────────────────────────────────────
    const completed = await prisma.fileUpload.update({
      where: { id: uploadId },
      data: {
        processingStatus: 'completed',
        vocabularyListId: vocabularyList.id,
        processedAt: new Date()
      }
    })

    // Clean up temp file
    try { await unlink(filePath) } catch {}

    return NextResponse.json({
      success: true,
      data: { ...completed, fileSize: Number(completed.fileSize) },
      vocabularyList,
      vocabularyCount: vocabularyItems.length,
      message: `Successfully extracted ${vocabularyItems.length} vocabulary items`
    })

  } catch (error) {
    console.error('Upload error:', error)

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
