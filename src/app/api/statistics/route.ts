import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface StatisticsResponse {
  overview: {
    totalWords: number;
    wordsLearned: number;
    averageAccuracy: number;
    studyStreak: number;
    totalQuizzes: number;
    totalStudyTime: number; // in minutes
  };
  weeklyProgress: Array<{
    date: string;
    wordsLearned: number;
    quizzesCompleted: number;
    accuracy: number;
  }>;
  masteryDistribution: Array<{
    level: number;
    count: number;
  }>;
  hskProgress: Array<{
    level: number;
    total: number;
    learned: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    date: string;
    type: 'quiz' | 'vocabulary';
    description: string;
    score?: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    // Overview statistics
    const [
      totalWordsResult,
      wordsLearnedResult,
      quizStatsResult,
      totalQuizzesResult
    ] = await Promise.all([
      // Total vocabulary items across all user's lists
      prisma.vocabularyItem.count({
        where: {
          vocabularyList: {
            userId: userId
          }
        }
      }),

      // Words with mastery level > 0
      prisma.userProgress.count({
        where: {
          userId: userId,
          masteryLevel: {
            gt: 0
          }
        }
      }),

      // Average accuracy from quiz attempts
      prisma.quizAttempt.aggregate({
        where: {
          userId: userId
        },
        _avg: {
          score: true
        },
        _sum: {
          timeSpentSeconds: true
        }
      }),

      // Total quizzes taken
      prisma.quizAttempt.count({
        where: {
          userId: userId
        }
      })
    ]);

    // Calculate study streak (consecutive days with quiz attempts)
    const studyStreak = await calculateStudyStreak(userId);

    // Weekly progress data
    const weeklyProgress = await getWeeklyProgress(userId, sevenDaysAgo);

    // Mastery level distribution
    const masteryDistribution = await prisma.userProgress.groupBy({
      by: ['masteryLevel'],
      where: {
        userId: userId
      },
      _count: {
        masteryLevel: true
      },
      orderBy: {
        masteryLevel: 'asc'
      }
    });

    // HSK progress
    const hskProgress = await getHSKProgress(userId);

    // Recent activity
    const recentActivity = await getRecentActivity(userId);

    const statistics: StatisticsResponse = {
      overview: {
        totalWords: totalWordsResult,
        wordsLearned: wordsLearnedResult,
        averageAccuracy: Math.round((quizStatsResult._avg.score || 0) * 100),
        studyStreak: studyStreak,
        totalQuizzes: totalQuizzesResult,
        totalStudyTime: Math.round((quizStatsResult._sum.timeSpentSeconds || 0) / 60)
      },
      weeklyProgress: weeklyProgress,
      masteryDistribution: masteryDistribution.map(item => ({
        level: item.masteryLevel,
        count: item._count.masteryLevel
      })),
      hskProgress: hskProgress,
      recentActivity: recentActivity
    };

    return NextResponse.json(statistics);

  } catch (error) {
    console.error('Statistics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

async function calculateStudyStreak(userId: string): Promise<number> {
  const today = startOfDay(new Date());
  let streak = 0;
  let checkDate = today;

  // Check each day backwards until we find a day without activity
  while (true) {
    const dayStart = startOfDay(checkDate);
    const dayEnd = endOfDay(checkDate);

    const hasActivity = await prisma.quizAttempt.findFirst({
      where: {
        userId: userId,
        completedAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    });

    if (hasActivity) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      // If today has no activity, don't count today in streak
      if (checkDate.getTime() === today.getTime()) {
        break;
      }
      // If it's a past day with no activity, streak is broken
      break;
    }

    // Prevent infinite loop - max 365 days
    if (streak >= 365) break;
  }

  return streak;
}

async function getWeeklyProgress(userId: string, sevenDaysAgo: Date) {
  const weeklyData = [];
  
  for (let i = 0; i < 7; i++) {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [quizzes, progress] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: {
          userId: userId,
          completedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      }),
      prisma.userProgress.count({
        where: {
          userId: userId,
          updatedAt: {
            gte: dayStart,
            lte: dayEnd
          },
          masteryLevel: {
            gt: 0
          }
        }
      })
    ]);

    const accuracy = quizzes.length > 0 
      ? Math.round((quizzes.reduce((sum, quiz) => sum + quiz.score, 0) / quizzes.length) * 100)
      : 0;

    weeklyData.push({
      date: format(date, 'MMM dd'),
      wordsLearned: progress,
      quizzesCompleted: quizzes.length,
      accuracy: accuracy
    });
  }

  return weeklyData;
}

async function getHSKProgress(userId: string) {
  const hskLevels = [1, 2, 3, 4, 5, 6];
  const progress = [];

  for (const level of hskLevels) {
    const [total, learned] = await Promise.all([
      prisma.vocabularyItem.count({
        where: {
          hskLevel: level,
          vocabularyList: {
            userId: userId
          }
        }
      }),
      prisma.userProgress.count({
        where: {
          userId: userId,
          masteryLevel: {
            gte: 1
          },
          vocabularyItem: {
            hskLevel: level
          }
        }
      })
    ]);

    progress.push({
      level: level,
      total: total,
      learned: learned,
      percentage: total > 0 ? Math.round((learned / total) * 100) : 0
    });
  }

  return progress;
}

async function getRecentActivity(userId: string) {
  const [recentQuizzes, recentProgress] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: {
        userId: userId
      },
      include: {
        quiz: true
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 5
    }),
    prisma.userProgress.findMany({
      where: {
        userId: userId,
        updatedAt: {
          gte: subDays(new Date(), 7)
        }
      },
      include: {
        vocabularyItem: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    })
  ]);

  const activities: Array<{
    date: string;
    type: 'quiz' | 'vocabulary';
    description: string;
    score?: number;
  }> = [];

  // Add quiz activities
  recentQuizzes.forEach(attempt => {
    activities.push({
      date: format(attempt.completedAt, 'MMM dd, HH:mm'),
      type: 'quiz' as const,
      description: `Completed quiz: ${attempt.quiz.title || 'Untitled Quiz'}`,
      score: Math.round(attempt.score * 100)
    });
  });

  // Add vocabulary progress activities
  recentProgress.forEach(progress => {
    activities.push({
      date: format(progress.updatedAt, 'MMM dd, HH:mm'),
      type: 'vocabulary' as const,
      description: `Practiced word: ${progress.vocabularyItem.simplified}`
    });
  });

  // Sort by date and take most recent 10
  return activities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
}