'use client'

import { useState } from 'react'
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
  const [showPinyin, setShowPinyin] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)

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
            onClick={() => setShowEnglish(!showEnglish)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showEnglish
                ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            English Translation
            {showEnglish && <span className="ml-1">✓</span>}
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
          {storyContent.map((sentence, index) => (
            <div key={sentence.id || index} className="group">
              {/* Chinese Text - Always Visible */}
              <div className="flex items-start gap-2 mb-2">
                <p className="text-lg leading-relaxed text-gray-900 flex-1">
                  {sentence.chinese}
                </p>
                <AudioPlayer 
                  text={sentence.chinese}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Pinyin - Toggleable */}
              {showPinyin && sentence.pinyin && (
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-red-600 text-sm font-medium">
                    {sentence.pinyin}
                  </p>
                  <AudioPlayer 
                    text={sentence.pinyin}
                    className="flex-shrink-0"
                  />
                </div>
              )}

              {/* English Translation - Toggleable */}
              {showEnglish && sentence.english && (
                <p className="text-gray-600 text-sm italic">
                  {sentence.english}
                </p>
              )}

              {/* Separator Line */}
              {index < storyContent.length - 1 && (
                <div className="mt-4 border-t border-gray-100"></div>
              )}
            </div>
          ))}
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