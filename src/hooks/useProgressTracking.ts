import { useState, useCallback } from 'react';

interface ProgressUpdate {
  vocabularyItemId: string;
  correct: boolean;
  timeSpentSeconds?: number;
}

interface ProgressResponse {
  message: string;
  progress: {
    masteryLevel: number;
    correctAnswers: number;
    totalAttempts: number;
    accuracy: number;
  };
}

interface UserProgress {
  id: string;
  masteryLevel: number;
  correctAnswers: number;
  totalAttempts: number;
  lastPracticed: string;
  vocabularyItem: {
    id: string;
    simplified: string;
    traditional: string;
    pinyin: string;
    englishDefinitions: string[];
    hskLevel: number;
  };
}

export const useProgressTracking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = useCallback(async (update: ProgressUpdate): Promise<ProgressResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update progress');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Progress update error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProgress = useCallback(async (
    vocabularyListId?: string,
    vocabularyItemId?: string
  ): Promise<UserProgress[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (vocabularyListId) params.append('vocabularyListId', vocabularyListId);
      if (vocabularyItemId) params.append('vocabularyItemId', vocabularyItemId);

      const response = await fetch(`/api/progress?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch progress');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Progress fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateMasteryColor = useCallback((masteryLevel: number): string => {
    switch (masteryLevel) {
      case 0: return 'text-gray-400';
      case 1: return 'text-red-500';
      case 2: return 'text-yellow-500';
      case 3: return 'text-blue-500';
      case 4: return 'text-green-500';
      case 5: return 'text-purple-500';
      default: return 'text-gray-400';
    }
  }, []);

  const getMasteryLabel = useCallback((masteryLevel: number): string => {
    switch (masteryLevel) {
      case 0: return 'Not Started';
      case 1: return 'Beginner';
      case 2: return 'Learning';
      case 3: return 'Familiar';
      case 4: return 'Proficient';
      case 5: return 'Mastered';
      default: return 'Unknown';
    }
  }, []);

  const calculateAccuracy = useCallback((correct: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }, []);

  return {
    updateProgress,
    fetchProgress,
    calculateMasteryColor,
    getMasteryLabel,
    calculateAccuracy,
    loading,
    error
  };
};