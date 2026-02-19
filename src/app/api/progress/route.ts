import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface ProgressUpdateRequest {
  vocabularyItemId: string;
  correct: boolean;
  timeSpentSeconds?: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ProgressUpdateRequest = await request.json();
    const { vocabularyItemId, correct, timeSpentSeconds } = body;

    if (!vocabularyItemId || typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: vocabularyItemId and correct' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Check if vocabulary item exists and belongs to user
    const vocabularyItem = await prisma.vocabularyItem.findFirst({
      where: {
        id: vocabularyItemId,
        vocabularyList: {
          userId: userId
        }
      }
    });

    if (!vocabularyItem) {
      return NextResponse.json(
        { error: 'Vocabulary item not found or access denied' },
        { status: 404 }
      );
    }

    // Update or create user progress
    const existingProgress = await prisma.userProgress.findUnique({
      where: {
        userId_vocabularyItemId: {
          userId: userId,
          vocabularyItemId: vocabularyItemId
        }
      }
    });

    let updatedProgress;

    if (existingProgress) {
      // Update existing progress
      const newCorrectAnswers = correct 
        ? existingProgress.correctAnswers + 1 
        : existingProgress.correctAnswers;
      const newTotalAttempts = existingProgress.totalAttempts + 1;
      const newAccuracy = newCorrectAnswers / newTotalAttempts;

      // Calculate new mastery level based on accuracy and total attempts
      let newMasteryLevel = existingProgress.masteryLevel;
      
      if (newTotalAttempts >= 3) {
        if (newAccuracy >= 0.8 && newTotalAttempts >= 5) {
          newMasteryLevel = Math.min(5, Math.max(newMasteryLevel, 3));
        } else if (newAccuracy >= 0.7 && newTotalAttempts >= 3) {
          newMasteryLevel = Math.min(5, Math.max(newMasteryLevel, 2));
        } else if (newAccuracy >= 0.5) {
          newMasteryLevel = Math.min(5, Math.max(newMasteryLevel, 1));
        }
      }

      // If user got it wrong and has low accuracy, might decrease mastery
      if (!correct && newAccuracy < 0.3 && newMasteryLevel > 0) {
        newMasteryLevel = Math.max(0, newMasteryLevel - 1);
      }

      updatedProgress = await prisma.userProgress.update({
        where: {
          userId_vocabularyItemId: {
            userId: userId,
            vocabularyItemId: vocabularyItemId
          }
        },
        data: {
          correctAnswers: newCorrectAnswers,
          totalAttempts: newTotalAttempts,
          masteryLevel: newMasteryLevel,
          lastPracticed: new Date(),
          updatedAt: new Date()
        }
      });

      // Also update the mastery level on the vocabulary item itself
      await prisma.vocabularyItem.update({
        where: { id: vocabularyItemId },
        data: { masteryLevel: newMasteryLevel }
      });

    } else {
      // Create new progress record
      const initialMasteryLevel = correct ? 1 : 0;

      updatedProgress = await prisma.userProgress.create({
        data: {
          userId: userId,
          vocabularyItemId: vocabularyItemId,
          correctAnswers: correct ? 1 : 0,
          totalAttempts: 1,
          masteryLevel: initialMasteryLevel,
          lastPracticed: new Date()
        }
      });

      // Update the vocabulary item mastery level
      await prisma.vocabularyItem.update({
        where: { id: vocabularyItemId },
        data: { masteryLevel: initialMasteryLevel }
      });
    }

    return NextResponse.json({
      message: 'Progress updated successfully',
      progress: {
        masteryLevel: updatedProgress.masteryLevel,
        correctAnswers: updatedProgress.correctAnswers,
        totalAttempts: updatedProgress.totalAttempts,
        accuracy: updatedProgress.totalAttempts > 0 
          ? Math.round((updatedProgress.correctAnswers / updatedProgress.totalAttempts) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch progress for specific vocabulary items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vocabularyListId = searchParams.get('vocabularyListId');
    const vocabularyItemId = searchParams.get('vocabularyItemId');

    const userId = session.user.id;
    let whereClause: any = { userId: userId };

    if (vocabularyItemId) {
      whereClause.vocabularyItemId = vocabularyItemId;
    } else if (vocabularyListId) {
      whereClause.vocabularyItem = {
        vocabularyListId: vocabularyListId
      };
    }

    const progress = await prisma.userProgress.findMany({
      where: whereClause,
      include: {
        vocabularyItem: {
          select: {
            id: true,
            simplified: true,
            traditional: true,
            pinyin: true,
            englishDefinitions: true,
            hskLevel: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Progress fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}