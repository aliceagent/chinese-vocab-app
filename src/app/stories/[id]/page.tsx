import Link from 'next/link'
import Layout from '@/components/common/Layout'
import StoryReader from '@/components/stories/StoryReader'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

interface StoryContent {
  chinese: string
  pinyin?: string
  english?: string
  id?: string
}

async function getStory(id: string) {
  // Return null if database not configured
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
    return null
  }
  
  try {
    const story = await prisma.generatedStory.findUnique({
      where: { id },
      include: {
        vocabularyList: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })
    return story
  } catch (error) {
    console.error('Error fetching story:', error)
    return null
  }
}

function parseStoryContent(content: any): StoryContent[] {
  // Handle different possible content formats
  if (!content) return []
  
  // If it's already an array of objects with the right structure
  if (Array.isArray(content)) {
    return content.map((item, index) => ({
      chinese: item.chinese || item.text || String(item),
      pinyin: item.pinyin || undefined,
      english: item.english || item.translation || undefined,
      id: item.id || `sentence-${index}`,
    }))
  }
  
  // If it's a single string, split by periods or newlines
  if (typeof content === 'string') {
    return content
      .split(/[。！？\n]/)
      .filter(sentence => sentence.trim().length > 0)
      .map((sentence, index) => ({
        chinese: sentence.trim() + (sentence.includes('？') ? '' : sentence.includes('！') ? '' : '。'),
        id: `sentence-${index}`,
      }))
  }
  
  // If it's an object, try to extract text
  if (typeof content === 'object' && content.text) {
    return parseStoryContent(content.text)
  }
  
  return []
}

export default async function StoryPage({ params }: PageProps) {
  const { id } = await params
  const story = await getStory(id)

  if (!story) {
    notFound()
  }

  const storyContent = parseStoryContent(story.content)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/vocabulary/${story.vocabularyListId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to {story.vocabularyList.name}
          </Link>

          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              {new Date(story.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Story Reader Component */}
        <StoryReader 
          storyContent={storyContent}
          title={story.title}
          difficultyLevel={story.difficultyLevel}
          storyType={story.storyType}
        />

        {/* Related Actions */}
        <div className="mt-8 bg-gray-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Practice with this story</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href={`/quiz/create?storyId=${story.id}`}
              className="flex items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Create Quiz
            </Link>
            
            <Link
              href={`/vocabulary/${story.vocabularyListId}`}
              className="flex items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Study Vocabulary
            </Link>
          </div>
        </div>

        {/* Story Metadata */}
        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>
            Story ID: {story.id} • 
            Generated from "{story.vocabularyList.name}" vocabulary list
            {story.regenerationCount > 0 && ` • Regenerated ${story.regenerationCount} times`}
          </p>
        </div>
      </div>
    </Layout>
  )
}