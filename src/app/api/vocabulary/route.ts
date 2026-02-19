import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Base vocabulary endpoint
    return NextResponse.json({
      status: 'ok',
      message: 'Vocabulary API base endpoint',
      timestamp: new Date().toISOString(),
      available_endpoints: [
        '/api/vocabulary/simple-test',
        '/api/vocabulary/[wordId]/details',
        '/api/vocabulary/lists',
        '/api/vocabulary/batch-details',
        '/api/vocabulary/templates'
      ]
    });
  } catch (error) {
    console.error('Vocabulary base endpoint error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}