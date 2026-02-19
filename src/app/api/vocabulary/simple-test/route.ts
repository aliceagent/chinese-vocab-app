import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check endpoint for vocabulary API
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Vocabulary API is working',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Simple test endpoint error:', error);
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