import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lazy load OpenAI to avoid bundling issues
let OpenAI: any = null

interface StoryGenerationRequest {
  vocabularyListId: string
  storyType: 'narrative' | 'dialogue' | 'news' | 'essay'
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  storyLength: 'short' | 'medium' | 'long'
}

interface GeneratedStoryResponse {
  success: boolean
  story?: {
    title: string
    content: Array<{
      chinese: string
      pinyin: string
      english: string
      id: string
    }>
    difficultyLevel: string
    storyType: string
    vocabularyUsed: string[]
  }
  error?: string
}

async function getOpenAI() {
  if (!OpenAI) {
    OpenAI = (await import('openai')).default
  }
  return OpenAI
}

export async function POST(request: Request) {
  try {
    const body: StoryGenerationRequest = await request.json()
    const { vocabularyListId, storyType, difficultyLevel, storyLength } = body

    // Validate request
    if (!vocabularyListId || !storyType || !difficultyLevel || !storyLength) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Check OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    // Get vocabulary list
    const vocabularyList = await prisma.vocabularyList.findUnique({
      where: { id: vocabularyListId },
      include: {
        vocabularyItems: {
          take: storyLength === 'short' ? 8 : storyLength === 'medium' ? 15 : 25
        }
      }
    })

    if (!vocabularyList || vocabularyList.vocabularyItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Vocabulary list not found or empty'
      }, { status: 404 })
    }

    const OpenAIClass = await getOpenAI()
    const openai = new OpenAIClass({ apiKey })

    // Build prompt
    const vocabularyWords = vocabularyList.vocabularyItems.map(item => 
      `${item.simplified} (${item.pinyin || 'no pinyin'}) - ${item.englishDefinitions.join(', ')}`
    ).join('\n')

    const wordCount = storyLength === 'short' ? '200-300' : 
                      storyLength === 'medium' ? '400-600' : '700-900'

    const prompt = `Create a ${difficultyLevel} level Chinese ${storyType} story using these vocabulary words:

${vocabularyWords}

Requirements:
- Use as many of the provided vocabulary words as possible
- Story should be ${wordCount} Chinese characters
- ${difficultyLevel === 'beginner' ? 'Use simple sentence structures and common characters' :
  difficultyLevel === 'intermediate' ? 'Use moderate complexity with some compound sentences' :
  'Use advanced grammar patterns and literary expressions'}
- Write a compelling ${storyType} that flows naturally
- Break into logical sentences for learning

Return the story as a JSON object with this EXACT structure:
{
  "title": "Story title in Chinese",
  "sentences": [
    {
      "chinese": "Chinese sentence",
      "pinyin": "pinyin with tone marks",
      "english": "English translation"
    }
  ],
  "vocabularyUsed": ["word1", "word2", "word3"]
}

Make sure the JSON is properly formatted and valid.`

    // Determine which model to use and configure accordingly
    const modelToUse = 'gpt-4o' // Use a model that supports JSON mode

    let completion
    try {
      // Try with JSON mode first (for models that support it)
      completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          {
            role: "system",
            content: "You are a Chinese language teacher creating educational stories. Always return valid JSON in the exact format requested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 2000
      })
    } catch (error: any) {
      // If JSON mode fails, try without it and parse manually
      if (error.message?.includes('json_object') || error.message?.includes('response_format')) {
        console.warn('JSON mode not supported, falling back to manual parsing')
        
        completion = await openai.chat.completions.create({
          model: modelToUse,
          messages: [
            {
              role: "system",
              content: "You are a Chinese language teacher creating educational stories. Always return valid JSON in the exact format requested. Start your response with { and end with }."
            },
            {
              role: "user",
              content: prompt + "\n\nIMPORTANT: Return ONLY the JSON object, no additional text or formatting."
            }
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      } else {
        throw error
      }
    }

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Parse the response
    let storyData
    try {
      // Clean up the content in case there's extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : content
      storyData = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse story JSON:', content)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse generated story'
      }, { status: 500 })
    }

    // Validate the parsed data
    if (!storyData.title || !storyData.sentences || !Array.isArray(storyData.sentences)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid story format received'
      }, { status: 500 })
    }

    // Transform to our expected format
    const story = {
      title: storyData.title,
      content: storyData.sentences.map((sentence: any, index: number) => ({
        chinese: sentence.chinese || '',
        pinyin: sentence.pinyin || '',
        english: sentence.english || '',
        id: `sentence-${index + 1}`
      })),
      difficultyLevel,
      storyType,
      vocabularyUsed: storyData.vocabularyUsed || []
    }

    // Save to database
    try {
      // For now, we'll skip saving to database since we don't have user authentication set up
      // In a real implementation, you'd get the userId from the authenticated session
      
      // await prisma.generatedStory.create({
      //   data: {
      //     userId: '00000000-0000-0000-0000-000000000000', // Would come from session
      //     title: story.title,
      //     content: story.content,
      //     storyType,
      //     difficultyLevel,
      //     vocabularyListId,
      //     vocabularyUsed: story.vocabularyUsed
      //   }
      // })
    } catch (dbError) {
      console.error('Failed to save story to database:', dbError)
      // Continue anyway - the story was generated successfully
    }

    const response: GeneratedStoryResponse = {
      success: true,
      story
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Story generation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate story'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Story Generation API',
    endpoints: {
      generate: 'POST /api/stories/generate'
    },
    parameters: {
      vocabularyListId: 'string (required)',
      storyType: 'narrative | dialogue | news | essay',
      difficultyLevel: 'beginner | intermediate | advanced',
      storyLength: 'short | medium | long'
    }
  })
}