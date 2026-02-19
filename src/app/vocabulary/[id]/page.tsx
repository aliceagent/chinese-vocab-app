import Link from 'next/link'
import Layout from '@/components/common/Layout'
import AudioPlayer from '@/components/audio/AudioPlayer'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getVocabularyList(id: string) {
  // Return null if database not configured
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
    return null
  }
  
  try {
    const list = await prisma.vocabularyList.findUnique({
      where: { id },
      include: {
        vocabularyItems: {
          orderBy: { hskLevel: 'asc' },
          take: 20, // Preview first 20 items
        },
        generatedStories: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            storyType: true,
            difficultyLevel: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            vocabularyItems: true,
            generatedStories: true,
          },
        },
      },
    })
    return list
  } catch (error) {
    console.error('Error fetching vocabulary list:', error)
    return null
  }
}

export default async function VocabularyListPage({ params }: PageProps) {
  const { id } = await params
  const list = await getVocabularyList(id)

  if (!list) {
    notFound()
  }

  const storyTypeLabels: Record<string, string> = {
    narrative: '📖 Narrative',
    dialogue: '💬 Dialogue',
    news: '📰 News',
    essay: '📝 Essay',
  }

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <Link
          href="/vocabulary"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Vocabulary Lists
        </Link>

        {/* List Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{list.name}</h1>
          {list.description && (
            <p className="text-gray-600 mb-4">{list.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {list._count.vocabularyItems} words
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {list._count.generatedStories} stories
            </span>
            {list.sourceFileName && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Source: {list.sourceFileName}
              </span>
            )}
          </div>
        </div>

        {/* Stories Using This List */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📚 Stories Using This Vocabulary
            </h2>
            <Link
              href={`/stories/generate?listId=${list.id}`}
              className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generate Story
            </Link>
          </div>

          {list.generatedStories.length > 0 ? (
            <div className="grid gap-4">
              {list.generatedStories.map((story) => (
                <Link
                  key={story.id}
                  href={`/stories/${story.id}`}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{story.title}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">
                          {storyTypeLabels[story.storyType] || story.storyType}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[story.difficultyLevel] || 'bg-gray-100 text-gray-800'}`}>
                          {story.difficultyLevel}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(story.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mb-4">No stories generated yet</p>
              <Link
                href={`/stories/generate?listId=${list.id}`}
                className="inline-flex items-center text-red-600 hover:text-red-700 font-medium"
              >
                Generate your first story
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          )}
        </section>

        {/* Vocabulary Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📝 Vocabulary Words
            </h2>
            {list._count.vocabularyItems > 20 && (
              <span className="text-sm text-gray-500">
                Showing 20 of {list._count.vocabularyItems}
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {list.vocabularyItems.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl font-medium text-gray-900">{item.simplified}</span>
                        {item.traditional && item.traditional !== item.simplified && (
                          <span className="text-gray-400">({item.traditional})</span>
                        )}
                        <AudioPlayer 
                          text={item.simplified} 
                          className="flex-shrink-0"
                          showLanguageToggle={true}
                        />
                      </div>
                      {item.pinyin && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 text-sm">{item.pinyin}</span>
                          <AudioPlayer 
                            text={item.pinyin} 
                            className="flex-shrink-0"
                          />
                        </div>
                      )}
                    </div>
                    {item.hskLevel && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex-shrink-0">
                        HSK {item.hskLevel}
                      </span>
                    )}
                  </div>
                  {item.englishDefinitions.length > 0 && (
                    <p className="text-gray-600 text-sm mt-1">
                      {item.englishDefinitions.join('; ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}
