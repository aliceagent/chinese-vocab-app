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
}

export default function FlashCard({ item, isFlipped, onFlip, cardNum, totalCards }: FlashCardProps) {
  const showTraditional = item.traditional && item.traditional !== item.simplified

  return (
    <div className="flex flex-col items-center">
      {/* Card counter */}
      <p className="text-sm text-gray-400 mb-4">
        {cardNum} / {totalCards}
      </p>

      {/* 3D flip card */}
      <div
        className="relative w-full max-w-sm cursor-pointer select-none"
        style={{ perspective: '1000px', height: '260px' }}
        onClick={onFlip}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-7xl font-medium text-gray-900 mb-2">{item.simplified}</p>
            {item.hskLevel && (
              <span className="mt-4 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                HSK {item.hskLevel}
              </span>
            )}
            <p className="mt-6 text-sm text-gray-400">Tap to reveal</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-6 text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {item.pinyin && (
              <p className="text-2xl text-red-600 font-medium mb-3">{item.pinyin}</p>
            )}
            {showTraditional && (
              <p className="text-lg text-gray-400 mb-2">{item.traditional}</p>
            )}
            {item.englishDefinitions.length > 0 && (
              <p className="text-gray-700 text-base leading-relaxed">
                {item.englishDefinitions.slice(0, 4).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
