// ==================== User Types ====================

export interface User {
  id: string
  username: string
  email: string
  subscriptionLevel: 'free' | 'premium' | 'teacher'
  learningPreferences: LearningPreferences
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface LearningPreferences {
  defaultShowPinyin: boolean
  defaultShowEnglish: boolean
  preferredStoryLength: 'short' | 'medium' | 'long'
}

// ==================== Vocabulary Types ====================

export interface VocabularyList {
  id: string
  userId: string
  name: string
  description?: string
  sourceFileName?: string
  sourceFileUrl?: string
  totalWords: number
  hskDistribution: HSKDistribution
  createdAt: string
  updatedAt: string
  vocabularyItems?: VocabularyItem[]
}

export interface VocabularyItem {
  id: string
  vocabularyListId: string
  simplified: string
  traditional?: string
  pinyin?: string
  englishDefinitions: string[]
  hskLevel?: number
  frequencyScore: number
  partOfSpeech?: string
  exampleSentences: string[]
  userNotes?: string
  masteryLevel: number
  createdAt: string
  updatedAt: string
}

export interface HSKDistribution {
  hsk1: number
  hsk2: number
  hsk3: number
  hsk4: number
  hsk5: number
  hsk6: number
}

// ==================== Story Types ====================

export interface GeneratedStory {
  id: string
  userId: string
  vocabularyListId: string
  title: string
  storyType: 'narrative' | 'dialogue' | 'news' | 'essay'
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  content: SentenceDetail[]
  vocabularyUsed: string[]
  regenerationCount: number
  createdAt: string
}

export interface SentenceDetail {
  sentenceId: string
  chinese: string
  pinyin: string
  english: string
  vocabularyUsed: VocabularyReference[]
}

export interface VocabularyReference {
  itemId: string
  simplified: string
  position: {
    start: number
    end: number
  }
}

// ==================== Quiz Types ====================

export interface Quiz {
  id: string
  userId: string
  vocabularyListId?: string
  storyId?: string
  title?: string
  questions: QuizQuestion[]
  totalQuestions: number
  createdAt: string
}

export interface QuizQuestion {
  questionId: string
  type: 'multiple_choice' | 'fill_in_blank' | 'matching'
  questionText: string
  options?: string[]
  correctAnswer: string
  explanation?: string
  vocabularyItemId: string
  hskLevel?: number
}

export interface QuizAttempt {
  id: string
  quizId: string
  userId: string
  userAnswers: QuizAnswer[]
  score: number
  timeSpentSeconds?: number
  completedAt: string
}

export interface QuizAnswer {
  questionId: string
  selectedAnswer: string
  timeSpent?: number
}

export interface QuestionResult {
  questionId: string
  correct: boolean
  userAnswer: string
  correctAnswer: string
  explanation: string
}

// ==================== Progress Types ====================

export interface UserProgress {
  id: string
  userId: string
  vocabularyItemId: string
  masteryLevel: number
  correctAnswers: number
  totalAttempts: number
  lastPracticed?: string
  createdAt: string
  updatedAt: string
}

export interface VocabularyProgress {
  vocabularyItemId: string
  simplified: string
  masteryLevelBefore: number
  masteryLevelAfter: number
  improvementReason: string
}

export interface UserProgressSummary {
  totalVocabulary: number
  masteredVocabulary: number
  masteryPercentage: number
}

// ==================== Upload Types ====================

export interface FileUpload {
  id: string
  userId: string
  originalFilename: string
  fileSize: number
  fileType: string
  storageKey: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
  vocabularyListId?: string
  createdAt: string
  processedAt?: string
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ==================== Story Generation Types ====================

export interface StoryGenerationOptions {
  vocabularyListId: string
  storyType?: 'narrative' | 'dialogue' | 'news' | 'essay'
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
  targetLength?: 'short' | 'medium' | 'long'
  vocabularyDensity?: 'low' | 'medium' | 'high'
  theme?: string
}

export interface QuizGenerationOptions {
  vocabularyListId: string
  storyId?: string
  questionCount?: number
  questionTypes?: ('multiple_choice' | 'fill_in_blank' | 'matching')[]
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
  includeHskLevels?: number[]
}
