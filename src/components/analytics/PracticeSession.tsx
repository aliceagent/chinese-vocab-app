"use client"

import React, { useState, useEffect } from 'react';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import ProgressIndicator from './ProgressIndicator';

interface VocabularyItem {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin?: string;
  englishDefinitions: string[];
  hskLevel?: number;
  masteryLevel: number;
}

interface PracticeSessionProps {
  vocabularyItems: VocabularyItem[];
  onSessionComplete?: (results: SessionResults) => void;
  sessionType?: 'review' | 'practice' | 'quiz';
}

interface SessionResults {
  totalItems: number;
  correctAnswers: number;
  sessionTime: number;
  itemResults: Array<{
    vocabularyItemId: string;
    correct: boolean;
    timeSpent: number;
  }>;
}

interface PracticeItem {
  item: VocabularyItem;
  startTime: number;
  answered: boolean;
  correct?: boolean;
}

const PracticeSession: React.FC<PracticeSessionProps> = ({
  vocabularyItems,
  onSessionComplete,
  sessionType = 'practice'
}) => {
  const { updateProgress, loading, error } = useProgressTracking();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');

  useEffect(() => {
    // Initialize practice items
    const items = vocabularyItems.map(item => ({
      item,
      startTime: 0,
      answered: false
    }));
    setPracticeItems(items);
  }, [vocabularyItems]);

  useEffect(() => {
    // Start timer for current item
    if (practiceItems.length > 0 && currentIndex < practiceItems.length) {
      setPracticeItems(prev => {
        const updated = [...prev];
        updated[currentIndex].startTime = Date.now();
        return updated;
      });
    }
  }, [currentIndex, practiceItems.length]);

  const currentItem = practiceItems[currentIndex];

  const handleAnswer = async (isCorrect: boolean) => {
    if (!currentItem || currentItem.answered) return;

    const timeSpent = Math.round((Date.now() - currentItem.startTime) / 1000);

    // Update local state
    setPracticeItems(prev => {
      const updated = [...prev];
      updated[currentIndex].answered = true;
      updated[currentIndex].correct = isCorrect;
      return updated;
    });

    // Update progress in database
    try {
      await updateProgress({
        vocabularyItemId: currentItem.item.id,
        correct: isCorrect,
        timeSpentSeconds: timeSpent
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }

    setShowAnswer(true);
  };

  const handleNext = () => {
    if (currentIndex < practiceItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setUserAnswer('');
    } else {
      completeSession();
    }
  };

  const completeSession = () => {
    const sessionTime = Math.round((Date.now() - sessionStartTime) / 1000);
    const correctAnswers = practiceItems.filter(item => item.correct).length;

    const results: SessionResults = {
      totalItems: practiceItems.length,
      correctAnswers,
      sessionTime,
      itemResults: practiceItems.map(item => ({
        vocabularyItemId: item.item.id,
        correct: item.correct || false,
        timeSpent: Math.round((Date.now() - item.startTime) / 1000)
      }))
    };

    setIsSessionComplete(true);
    onSessionComplete?.(results);
  };

  const getSessionProgress = () => {
    const answered = practiceItems.filter(item => item.answered).length;
    return {
      current: answered,
      total: practiceItems.length,
      percentage: practiceItems.length > 0 ? Math.round((answered / practiceItems.length) * 100) : 0
    };
  };

  if (practiceItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No vocabulary items to practice.</p>
      </div>
    );
  }

  if (isSessionComplete) {
    const progress = getSessionProgress();
    const correctAnswers = practiceItems.filter(item => item.correct).length;
    const accuracy = Math.round((correctAnswers / practiceItems.length) * 100);

    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
          <p className="text-gray-600 mb-6">Great job practicing your Chinese vocabulary.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Practice Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  const progress = getSessionProgress();

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session</span>
          <span>{progress.current + 1} of {progress.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((progress.current + 1) / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Item */}
      <div className="text-center mb-8">
        <div className="text-6xl font-bold text-gray-900 mb-4">
          {currentItem.item.simplified}
          {currentItem.item.traditional && currentItem.item.traditional !== currentItem.item.simplified && (
            <span className="text-4xl text-gray-600 ml-2">({currentItem.item.traditional})</span>
          )}
        </div>
        
        {currentItem.item.pinyin && (
          <div className="text-xl text-gray-600 mb-4">
            {currentItem.item.pinyin}
          </div>
        )}

        {currentItem.item.hskLevel && (
          <div className="text-sm text-gray-500 mb-4">
            HSK Level {currentItem.item.hskLevel}
          </div>
        )}

        {/* Progress Indicator for Current Item */}
        <div className="mb-6">
          <ProgressIndicator
            masteryLevel={currentItem.item.masteryLevel}
            showDetails={false}
            size="sm"
          />
        </div>
      </div>

      {/* Answer Section */}
      {!showAnswer ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">
              What does this word mean?
            </p>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none h-32"
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium"
              disabled={loading}
            >
              Don't Know
            </button>
            <button
              onClick={() => setShowAnswer(true)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium"
            >
              Show Answer
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium"
              disabled={loading}
            >
              I Know This
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Definitions:</h3>
            <ul className="space-y-2">
              {currentItem.item.englishDefinitions.map((definition, index) => (
                <li key={index} className="text-gray-700">
                  • {definition}
                </li>
              ))}
            </ul>
          </div>

          {currentItem.answered && (
            <div className={`p-4 rounded-lg ${
              currentItem.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${currentItem.correct ? 'text-green-800' : 'text-red-800'}`}>
                {currentItem.correct ? '✓ Correct!' : '✗ Keep practicing this word'}
              </p>
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium"
          >
            {currentIndex < practiceItems.length - 1 ? 'Next Word' : 'Complete Session'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PracticeSession;