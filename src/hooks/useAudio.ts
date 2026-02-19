'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseAudioOptions {
  rate?: number
  volume?: number
  lang?: string
}

interface UseAudioReturn {
  isPlaying: boolean
  isSupported: boolean
  error: string | null
  play: (text: string, options?: UseAudioOptions) => Promise<void>
  stop: () => void
  getVoices: () => SpeechSynthesisVoice[]
  getChineseVoices: () => SpeechSynthesisVoice[]
}

export const useAudio = (defaultOptions: UseAudioOptions = {}): UseAudioReturn => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsSupported('speechSynthesis' in window)
  }, [])

  const getVoices = useCallback(() => {
    if (!isSupported) return []
    return window.speechSynthesis.getVoices()
  }, [isSupported])

  const getChineseVoices = useCallback(() => {
    const voices = getVoices()
    return voices.filter(voice => 
      voice.lang.startsWith('zh') || 
      voice.lang.includes('Chinese') ||
      voice.name.toLowerCase().includes('chinese') ||
      voice.name.toLowerCase().includes('mandarin') ||
      voice.name.toLowerCase().includes('cantonese')
    )
  }, [getVoices])

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
  }, [isSupported])

  const play = useCallback(async (text: string, options: UseAudioOptions = {}) => {
    if (!isSupported) {
      setError('Speech synthesis not supported in this browser')
      return
    }

    if (!text) {
      setError('No text provided for speech synthesis')
      return
    }

    try {
      setIsPlaying(true)
      setError(null)

      // Cancel any ongoing speech
      stop()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = options.rate ?? defaultOptions.rate ?? 0.8
      utterance.volume = options.volume ?? defaultOptions.volume ?? 0.8
      utterance.lang = options.lang ?? defaultOptions.lang ?? 'zh-CN'

      // Try to find an appropriate voice
      const voices = getVoices()
      if (voices.length > 0) {
        let selectedVoice: SpeechSynthesisVoice | null = null

        // First, try to find a voice matching the specified language
        if (utterance.lang) {
          selectedVoice = voices.find(voice => voice.lang === utterance.lang) || null
        }

        // If no exact match, try Chinese voices
        if (!selectedVoice) {
          const chineseVoices = getChineseVoices()
          if (chineseVoices.length > 0) {
            selectedVoice = chineseVoices[0]
          }
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }

      // Set up event handlers
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = (event) => {
        setIsPlaying(false)
        setError(`Speech error: ${event.error}`)
      }

      // Speak the text
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      setIsPlaying(false)
      setError('Failed to initialize speech synthesis')
      console.error('Audio playback error:', err)
    }
  }, [isSupported, defaultOptions, stop, getVoices, getChineseVoices])

  return {
    isPlaying,
    isSupported,
    error,
    play,
    stop,
    getVoices,
    getChineseVoices
  }
}