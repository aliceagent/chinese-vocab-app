'use client'

interface VocabItem {
  id: string
  simplified: string
  traditional: string | null
  pinyin: string | null
  englishDefinitions: string[]
  hskLevel: number | null
}

interface FlashCardProps {
  item: VocabItem
  isFlipped: boolean
  onFlip: () => void
  cardNum: number
  totalCards: number
  mode: 'zh-en' | 'en-zh'
  showPinyin: boolean
  onTogglePinyin: () => void
}

export default function FlashCard({
  item, isFlipped, onFlip, cardNum, totalCards, mode, showPinyin, onTogglePinyin,
}: FlashCardProps) {
  const showTraditional = item.traditional && item.traditional !== item.simplified

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-gray-400 mb-4">{cardNum} / {totalCards}</p>

      <div
        className="relative w-full max-w-sm cursor-pointer select-none"
        style={{ perspective: '1000px', height: '290px' }}
        onClick={onFlip}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ── Front ── */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {mode === 'zh-en' ? (
              <>
                <p className="text-7xl font-medium text-gray-900">{item.simplified}</p>
                {item.hskLevel && (
                  <span className="mt-4 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    HSK {item.hskLevel}
                  </span>
                )}
              </>
            ) : (
              <p className="text-xl text-gray-700 text-center leading-relaxed px-2">
                {item.englishDefinitions.slice(0, 3).join(' · ')}
              </p>
            )}
            <p className="mt-6 text-sm text-gray-400">Tap to reveal</p>
          </div>

          {/* ── Back ── */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-6 text-center gap-2"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            onClick={e => e.stopPropagation()}
          >
            {mode === 'zh-en' ? (
              <>
                {showPinyin && item.pinyin && (
                  <p className="text-2xl text-red-600 font-medium">{item.pinyin}</p>
                )}
                {showTraditional && (
                  <p className="text-base text-gray-400">{item.traditional}</p>
                )}
                {item.englishDefinitions.length > 0 && (
                  <p className="text-gray-700 text-base leading-relaxed">
                    {item.englishDefinitions.slice(0, 4).join(' · ')}
                  </p>
                )}
                {item.pinyin && (
                  <button
                    onClick={onTogglePinyin}
                    className="mt-2 text-xs text-gray-400 hover:text-red-500 underline transition-colors"
                  >
                    {showPinyin ? 'Hide pinyin' : 'Show pinyin'}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-7xl font-medium text-gray-900">{item.simplified}</p>
                {showTraditional && (
                  <p className="text-base text-gray-400">{item.traditional}</p>
                )}
                {item.pinyin && (
                  <>
                    {showPinyin && (
                      <p className="text-2xl text-red-600 font-medium">{item.pinyin}</p>
                    )}
                    <button
                      onClick={onTogglePinyin}
                      className="mt-1 text-xs text-gray-400 hover:text-red-500 underline transition-colors"
                    >
                      {showPinyin ? 'Hide pinyin' : 'Show pinyin'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
