'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/common/Layout'

interface VocabularyList {
  id: string
  name: string
  description: string | null
  _count: {
    vocabularyItems: number
    generatedStories: number
  }
}

interface GeneratedStory {
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

function GenerateStoryPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [storyType, setStoryType] = useState<'narrative' | 'dialogue' | 'news' | 'essay'>('narrative')
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [storyLength, setStoryLength] = useState<'short' | 'medium' | 'long'>('short')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null)
  const [vocabularyLists, setVocabularyLists] = useState<VocabularyList[]>([])
  const [listsLoaded, setListsLoaded] = useState(false)

  // Load vocabulary lists on component mount
  useEffect(() => {
    loadVocabularyLists()
    // Pre-select list from URL query param
    const listId = searchParams.get('listId')
    if (listId) setSelectedListId(listId)
  }, [searchParams])

  async function loadVocabularyLists() {
    try {
      const res = await fetch('/api/vocabulary/lists')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setVocabularyLists(json.data)
        // Auto-select first list if only one exists and nothing pre-selected
        const listId = new URLSearchParams(window.location.search).get('listId')
        if (!listId && json.data.length === 1) {
          setSelectedListId(json.data[0].id)
        }
      }
      setListsLoaded(true)
    } catch (error) {
      console.error('Failed to load vocabulary lists:', error)
      setListsLoaded(true)
    }
  }

  async function handleGenerate() {
    if (!selectedListId) {
      setError('Please select a vocabulary list')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vocabularyListId: selectedListId,
          storyType,
          difficultyLevel,
          storyLength
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate story')
      }

      if (result.success && result.story) {
        setGeneratedStory(result.story)
      } else {
        throw new Error(result.error || 'No story generated')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to generate story')
    } finally {
      setIsGenerating(false)
    }
  }

  if (generatedStory) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => setGeneratedStory(null)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Generate Another Story
            </button>
          </div>

          {/* Story Reader Component would go here */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{generatedStory.title}</h1>
            <div className="space-y-4">
              {generatedStory.content.map((sentence, index) => (
                <div key={sentence.id || index} className="border-b border-gray-100 pb-4">
                  <p className="text-lg text-gray-900 mb-2">{sentence.chinese}</p>
                  <p className="text-sm text-red-600 mb-1">{sentence.pinyin}</p>
                  <p className="text-sm text-gray-600 italic">{sentence.english}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <Link
          href="/stories"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Stories
        </Link>

        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate New Story</h1>
          <p className="text-gray-600">Create a personalized Chinese story using your vocabulary lists</p>
        </div>

        {/* Generation Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Story Configuration</h2>
          
          <div className="space-y-6">
            {/* Vocabulary List Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vocabulary List
              </label>
              {!listsLoaded ? (
                <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
              ) : vocabularyLists.length > 0 ? (
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select a vocabulary list</option>
                  {vocabularyLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list._count.vocabularyItems} words)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No vocabulary lists available</p>
                  <Link
                    href="/upload"
                    className="inline-flex items-center text-red-600 hover:text-red-700 font-medium"
                  >
                    Create your first vocabulary list
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>

            {/* Story Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Story Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'narrative', label: '📖 Narrative', desc: 'Traditional story' },
                  { value: 'dialogue', label: '💬 Dialogue', desc: 'Conversation-based' },
                  { value: 'news', label: '📰 News', desc: 'News article style' },
                  { value: 'essay', label: '📝 Essay', desc: 'Educational essay' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStoryType(option.value as any)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      storyType === option.value
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'beginner', label: '🟢 Beginner', desc: 'Simple sentences' },
                  { value: 'intermediate', label: '🟡 Intermediate', desc: 'Moderate complexity' },
                  { value: 'advanced', label: '🔴 Advanced', desc: 'Complex grammar' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDifficultyLevel(option.value as any)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      difficultyLevel === option.value
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Story Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Story Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'short', label: 'Short', desc: '200-300 characters' },
                  { value: 'medium', label: 'Medium', desc: '400-600 characters' },
                  { value: 'long', label: 'Long', desc: '700-900 characters' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStoryLength(option.value as any)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      storyLength === option.value
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedListId}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                isGenerating || !selectedListId
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generating Story...
                </>
              ) : (
                'Generate Story'
              )}
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">How Story Generation Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="font-semibold text-blue-900 mb-1">Choose Configuration</h4>
              <p className="text-sm text-blue-800">Select your vocabulary list and story preferences</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-blue-900 mb-1">AI Generation</h4>
              <p className="text-sm text-blue-800">AI creates a story incorporating your vocabulary words</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-blue-900 mb-1">Read & Learn</h4>
              <p className="text-sm text-blue-800">Practice with Chinese, Pinyin, and English translations</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default function GenerateStoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>}>
      <GenerateStoryPageInner />
    </Suspense>
  )
}