import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const maxDuration = 60

let OpenAIClass: any = null
async function getOpenAI() {
  if (!OpenAIClass) {
    OpenAIClass = (await import('openai')).default
  }
  return OpenAIClass
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized - please log in' }, { status: 401 })
    }

    const body = await request.json()
    const { text, listName } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ success: false, error: 'No text provided' }, { status: 400 })
    }

    const trimmedText = text.trim().slice(0, 10000) // cap at 10k chars

    // Extract/generate vocab via OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not set')

    const OpenAIConstructor = await getOpenAI()
    const openai = new OpenAIConstructor({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a Chinese language expert. The user has pasted text that may be in English, Chinese, or a mix of both. Your job:
- If the text contains Chinese characters: extract them as vocabulary items
- If the text contains English words or phrases: translate them to Chinese and create vocab items
- If mixed: handle both
- Deduplicate entries
- Return ONLY a valid JSON array, no other text:
[{"hanzi":"汉字","pinyin":"pīnyīn","english":"meaning"}]`
        },
        {
          role: 'user',
          content: `Create a vocabulary list from this text:\n\n${trimmedText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    })

    let vocabularyItems: Array<{ hanzi: string; pinyin?: string; english?: string }> = []
    try {
      const raw = completion.choices[0].message.content?.trim() || ''
      const match = raw.match(/\[[\s\S]*\]/)
      vocabularyItems = JSON.parse(match ? match[0] : raw)
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e)
      throw new Error('Failed to parse vocabulary from text')
    }

    if (!vocabularyItems.length) {
      return NextResponse.json({ success: false, error: 'No vocabulary items could be extracted from the text' }, { status: 422 })
    }

    // Create vocab list
    const name = listName?.trim() || `Pasted Vocabulary (${new Date().toLocaleDateString()})`
    const vocabularyList = await prisma.vocabularyList.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        name,
        description: `Created from pasted text`,
        sourceFileName: null,
        totalWords: vocabularyItems.length,
        hskDistribution: {}
      }
    })

    // Batch insert items
    const validItems = vocabularyItems.filter(item => item.hanzi && typeof item.hanzi === 'string')
    if (validItems.length > 0) {
      await prisma.vocabularyItem.createMany({
        data: validItems.map(item => ({
          id: randomUUID(),
          vocabularyListId: vocabularyList.id,
          simplified: item.hanzi,
          traditional: null,
          pinyin: item.pinyin || null,
          englishDefinitions: [item.english || ''],
          hskLevel: null,
          frequencyScore: 0,
          partOfSpeech: null,
          exampleSentences: [],
          userNotes: null,
          masteryLevel: 0
        })),
        skipDuplicates: true
      })
    }

    return NextResponse.json({
      success: true,
      vocabularyList,
      vocabularyCount: validItems.length,
      message: `Created ${validItems.length} vocabulary items`
    })

  } catch (error) {
    console.error('Paste vocab error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process text' },
      { status: 500 }
    )
  }
}
