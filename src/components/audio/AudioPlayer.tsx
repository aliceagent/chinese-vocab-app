'use client'

import React, { useState, useEffect } from 'react'

interface AudioPlayerProps {
  text: string
  language?: 'zh-CN' | 'zh-HK' // Mandarin (China) or Cantonese (Hong Kong)
  className?: string
  showLanguageToggle?: boolean
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  language = 'zh-CN',
  className = '',
  showLanguageToggle = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState(language)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if Web Speech API is supported
    setIsSupported('speechSynthesis' in window)
  }, [])

  const playAudio = async () => {
    if (!isSupported) {
      setError('Audio playback not supported in this browser')
      return
    }

    if (!text) {
      setError('No text to speak')
      return
    }

    try {
      setIsPlaying(true)
      setError(null)

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = currentLanguage
      utterance.rate = 0.8 // Slightly slower for learning
      utterance.volume = 0.8

      // Try to find a Chinese voice
      const voices = window.speechSynthesis.getVoices()
      const chineseVoices = voices.filter(voice => 
        voice.lang.startsWith('zh') || 
        voice.lang.includes('Chinese') ||
        voice.name.toLowerCase().includes('chinese')
      )

      if (chineseVoices.length > 0) {
        // Prefer voices that match the selected language
        const preferredVoice = chineseVoices.find(voice => 
          voice.lang === currentLanguage
        ) || chineseVoices[0]
        
        utterance.voice = preferredVoice
      }

      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = (event) => {
        setIsPlaying(false)
        setError(`Speech error: ${event.error}`)
      }

      window.speechSynthesis.speak(utterance)
    } catch (err) {
      setIsPlaying(false)
      setError('Failed to play audio')
      console.error('Audio playback error:', err)
    }
  }

  const stopAudio = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
  }

  const toggleLanguage = () => {
    if (isPlaying) {
      stopAudio()
    }
    setCurrentLanguage(currentLanguage === 'zh-CN' ? 'zh-HK' : 'zh-CN')
  }

  if (!isSupported) {
    return (
      <div className={`text-gray-400 ${className}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={isPlaying ? stopAudio : playAudio}
        disabled={!text}
        className={`
          flex items-center justify-center w-8 h-8 rounded-full transition-all
          ${isPlaying
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
          ${!text ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        `}
        title={isPlaying ? 'Stop pronunciation' : 'Play pronunciation'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h4v16H6zM14 4h4v16h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 10l4-4v12l-4-4H4a1 1 0 01-1-1v-2a1 1 0 011-1h2z" />
          </svg>
        )}
      </button>

      {showLanguageToggle && (
        <button
          onClick={toggleLanguage}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
          title={`Switch to ${currentLanguage === 'zh-CN' ? 'Cantonese' : 'Mandarin'}`}
        >
          {currentLanguage === 'zh-CN' ? '普通话' : '廣東話'}
        </button>
      )}

      {error && (
        <div className="text-xs text-red-500 max-w-32 truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  )
}

export default AudioPlayer