'use client'

import { useState, useCallback } from 'react'
import AudioPlayer from '@/components/audio/AudioPlayer'

interface StoryReaderProps {
  storyContent: Array<{
    chinese: string
    pinyin?: string
    english?: string
    id?: string
  }>
  title: string
  difficultyLevel: string
  storyType: string
}

export default function StoryReader({ 
  storyContent, 
  title, 
  difficultyLevel, 
  storyType 
}: StoryReaderProps) {
  const [showPinyin, setShowPinyin] = useState(true)
  const [showAllEnglish, setShowAllEnglish] = useState(false)
  // Track which individual sentences have English revealed
  const [revealedSentences, setRevealedSentences] = useState<Set<string>>(new Set())

  const toggleSentenceEnglish = useCallback((id: string) => {
    setRevealedSentences(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleShowAllEnglish = () => {
    if (showAllEnglish) {
      setShowAllEnglish(false)
      setRevealedSentences(new Set())
    } else {
      setShowAllEnglish(true)
      setRevealedSentences(new Set())
    }
  }

  const isEnglishVisible = (id: string) => showAllEnglish || revealedSentences.has(id)

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    advanced: 'bg-red-100 text-red-800 border-red-200',
  }

  const storyTypeIcons: Record<string, string> = {
    narrative: '📖',
    dialogue: '💬',
    news: '📰',
    essay: '📝',
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Story Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center text-gray-600">
                {storyTypeIcons[storyType] || '📖'} {storyType}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficultyColors[difficultyLevel] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                {difficultyLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Reading Controls */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showPinyin
                ? 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            拼音 Pinyin
            {showPinyin && <span className="ml-1">✓</span>}
          </button>
          
          <button
            onClick={handleShowAllEnglish}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showAllEnglish
                ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Show All English
            {showAllEnglish && <span className="ml-1">✓</span>}
          </button>

          <div className="flex-1"></div>

          <AudioPlayer 
            text={storyContent.map(s => s.chinese).join(' ')}
            className="flex-shrink-0"
            showLanguageToggle={true}
          />
        </div>
      </div>

      {/* Story Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-6">
          {storyContent.map((sentence, index) => {
            const sentenceId = sentence.id || `sentence-${index}`
            const englishVisible = isEnglishVisible(sentenceId)

            return (
              <div key={sentenceId} className="group">
                {/* Chinese Text */}
                <div className="flex items-start gap-2 mb-2">
                  <p className="text-lg leading-relaxed text-gray-900 flex-1">
                    {sentence.chinese}
                  </p>
                  <AudioPlayer 
                    text={sentence.chinese}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* Pinyin - Global Toggle */}
                {showPinyin && sentence.pinyin && (
                  <p className="text-red-600 text-sm font-medium mb-2">
                    {sentence.pinyin}
                  </p>
                )}

                {/* English row: reveal button + translation */}
                {sentence.english && (
                  <div className="flex items-start gap-2">
                    {/* Small reveal button */}
                    <button
                      onClick={() => toggleSentenceEnglish(sentenceId)}
                      title={englishVisible ? 'Hide English' : 'Show English'}
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors mt-0.5 ${
                        englishVisible
                          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                      }`}
                    >
                      {englishVisible ? (
                        // Eye-open icon
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        // Eye-slash icon
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>

                    {/* English text - shown/hidden */}
                    {englishVisible ? (
                      <p className="text-gray-600 text-sm italic flex-1">
                        {sentence.english}
                      </p>
                    ) : (
                      <p className="text-gray-300 text-sm italic select-none flex-1">
                        ···
                      </p>
                    )}
                  </div>
                )}

                {/* Separator */}
                {index < storyContent.length - 1 && (
                  <div className="mt-4 border-t border-gray-100"></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Reading Progress Indicator */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          {storyContent.length} sentences • Reading practice
        </p>
      </div>
    </div>
  )
}
