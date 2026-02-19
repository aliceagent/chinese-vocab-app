import Link from 'next/link'
import Layout from '@/components/common/Layout'
import { prisma } from '@/lib/prisma'

async function getStories() {
  // Return empty array if database not configured
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
    return []
  }
  
  try {
    const stories = await prisma.generatedStory.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vocabularyList: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            quizzes: true,
          },
        },
      },
      take: 50, // Limit to last 50 stories
    })
    return stories
  } catch (error) {
    console.error('Error fetching stories:', error)
    return []
  }
}

export default async function StoriesPage() {
  const stories = await getStories()

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
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chinese Stories</h1>
            <p className="text-gray-600 mt-1">Practice reading with generated stories</p>
          </div>
          <Link
            href="/vocabulary"
            className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Vocabulary Lists
          </Link>
        </div>

        {/* Stories Grid */}
        {stories.length > 0 ? (
          <div className="grid gap-4">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <h2 className="text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                        {story.title}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {storyTypeLabels[story.storyType] || story.storyType}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[story.difficultyLevel] || 'bg-gray-100 text-gray-800'}`}>
                          {story.difficultyLevel}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        From: {story.vocabularyList.name}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {story._count.quizzes} {story._count.quizzes === 1 ? 'quiz' : 'quizzes'}
                      </span>
                      {story.regenerationCount > 0 && (
                        <span className="flex items-center text-amber-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerated {story.regenerationCount}x
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400">
                      {new Date(story.createdAt).toLocaleDateString()} • 
                      {Array.isArray(story.content) ? story.content.length : 'Unknown'} sentences
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stories available</h3>
            <p className="text-gray-500 mb-6">Generate your first story from a vocabulary list</p>
            <Link
              href="/vocabulary"
              className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Browse Vocabulary Lists
            </Link>
          </div>
        )}

        {/* Reading Tips */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reading Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-1">• Start without Pinyin</p>
              <p className="text-blue-700">Challenge yourself to read characters first</p>
            </div>
            <div>
              <p className="font-medium mb-1">• Use English as confirmation</p>
              <p className="text-blue-700">Check your understanding after reading</p>
            </div>
            <div>
              <p className="font-medium mb-1">• Listen to pronunciation</p>
              <p className="text-blue-700">Click audio buttons to hear native speech</p>
            </div>
            <div>
              <p className="font-medium mb-1">• Practice regularly</p>
              <p className="text-blue-700">Daily reading builds fluency faster</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}