# Audio Pronunciation Implementation

## Overview
This document describes the implementation of audio pronunciation support for Chinese vocabulary in the Chinese Vocab app.

## Features Implemented

### 1. AudioPlayer Component
- **Location**: `src/components/audio/AudioPlayer.tsx`
- **Features**:
  - Web Speech API integration for browser-native TTS
  - Support for both Mandarin (zh-CN) and Cantonese (zh-HK)
  - Language toggle functionality
  - Play/stop controls with visual feedback
  - Graceful fallback for unsupported browsers
  - Error handling and user feedback

### 2. Audio Hook
- **Location**: `src/hooks/useAudio.ts`
- **Features**:
  - Reusable audio functionality across components
  - Voice detection and selection for Chinese languages
  - Configurable speech rate, volume, and language
  - Error handling and state management

### 3. Integration Points
- **Vocabulary List View**: Added audio players next to each vocabulary item
- **Dual Audio Support**: 
  - Chinese characters (with language toggle)
  - Pinyin pronunciation
- **UI Enhancements**: 
  - Clean, accessible design
  - Hover effects and visual feedback
  - Mobile-responsive layout

## Technical Implementation

### Web Speech API Usage
```javascript
const utterance = new SpeechSynthesisUtterance(text)
utterance.lang = 'zh-CN' // or 'zh-HK'
utterance.rate = 0.8     // Slower for learning
utterance.volume = 0.8
window.speechSynthesis.speak(utterance)
```

### Voice Selection Logic
1. First attempts to find voices matching exact language code (`zh-CN` or `zh-HK`)
2. Falls back to any Chinese voices detected
3. Uses browser default if no Chinese voices available

### Browser Compatibility
- **Supported**: Chrome, Safari, Edge, Firefox
- **Fallback**: Shows disabled icon for unsupported browsers
- **Progressive Enhancement**: App remains fully functional without audio

## Usage Examples

### Basic Audio Player
```tsx
import AudioPlayer from '@/components/audio/AudioPlayer'

<AudioPlayer 
  text="你好" 
  language="zh-CN"
  showLanguageToggle={true}
/>
```

### Using the Audio Hook
```tsx
import { useAudio } from '@/hooks/useAudio'

const { play, isPlaying, isSupported } = useAudio()

// Play pronunciation
await play("你好", { lang: "zh-CN", rate: 0.8 })
```

## UI/UX Design Decisions

### Visual Design
- Circular play/stop buttons with intuitive icons
- Color coding: Gray for idle, Red for playing
- Small form factor to avoid cluttering vocabulary lists
- Smooth hover animations and transitions

### Language Toggle
- Displays "普通话" (Mandarin) and "廣東話" (Cantonese) labels
- Clicking switches between zh-CN and zh-HK languages
- Only shown when `showLanguageToggle={true}`

### Error Handling
- Silent fallback for unsupported browsers
- Inline error messages for speech synthesis failures
- Graceful degradation without breaking app functionality

## Performance Considerations

### Lazy Loading
- Audio components are client-side only (`'use client'`)
- No server-side rendering overhead
- Speech API initialized only when needed

### Memory Management
- Properly cancels ongoing speech before starting new ones
- Cleans up event listeners on component unmount
- Minimal state management for optimal performance

## Future Enhancements

### Potential Improvements
1. **External TTS Integration**: Integrate services like Azure Cognitive Services or Google Cloud TTS for higher quality pronunciation
2. **Audio Caching**: Cache generated audio for frequently used words
3. **Pronunciation Assessment**: Use speech recognition to assess user pronunciation
4. **Regional Accents**: Support for different regional pronunciations
5. **Playback Speed Control**: User-configurable playback speed
6. **Audio Waveform Visualization**: Visual representation of audio playback

### API Integration Options
```javascript
// Example Azure TTS integration
const synthesizeSpeech = async (text, language) => {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language })
  })
  const audioBlob = await response.blob()
  return URL.createObjectURL(audioBlob)
}
```

## Testing Recommendations

### Manual Testing
1. Test on different browsers (Chrome, Safari, Firefox, Edge)
2. Verify language switching functionality
3. Test with various Chinese characters and pinyin
4. Check mobile responsiveness
5. Verify graceful fallback in unsupported environments

### Automated Testing
1. Component rendering tests
2. Audio API availability detection tests
3. Error handling validation
4. Accessibility compliance tests

### Browser Support Matrix
| Browser | Web Speech API | Notes |
|---------|----------------|-------|
| Chrome 33+ | ✅ Full support | Best voice quality |
| Safari 14.1+ | ✅ Full support | Good voice quality |
| Firefox 49+ | ⚠️ Limited | May have voice limitations |
| Edge 14+ | ✅ Full support | Good voice quality |
| Mobile Safari | ✅ Supported | iOS 7+ |
| Chrome Mobile | ✅ Supported | Android 4.4+ |

## Implementation Verification

### Core Features Verified
- ✅ Audio playback for Chinese vocabulary items
- ✅ Web Speech API integration
- ✅ Mandarin and Cantonese language support
- ✅ Play button UI integration
- ✅ Graceful fallback for unsupported browsers
- ✅ Error handling and user feedback

### Integration Points
- ✅ Vocabulary list page (`/vocabulary/[id]`)
- ✅ Both Chinese characters and pinyin pronunciation
- ✅ Responsive design and mobile compatibility
- ✅ TypeScript support and type safety

The audio pronunciation feature is now fully implemented and ready for user testing and feedback.