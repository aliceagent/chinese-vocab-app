import { NextRequest, NextResponse } from 'next/server'

// Global progress store (in production, use Redis or similar)
declare global {
  var uploadProgress: Map<string, any> | undefined
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params

  if (!uploadId) {
    return NextResponse.json(
      { error: 'Upload ID is required' },
      { status: 400 }
    )
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connected',
        uploadId,
        timestamp: new Date().toISOString()
      })}\n\n`
      controller.enqueue(encoder.encode(data))

      // Poll for progress updates
      const pollInterval = setInterval(() => {
        try {
          if (global.uploadProgress && global.uploadProgress.has(uploadId)) {
            const progressData = global.uploadProgress.get(uploadId)
            
            const data = `data: ${JSON.stringify({
              ...progressData,
              timestamp: new Date().toISOString()
            })}\n\n`
            
            controller.enqueue(encoder.encode(data))

            // If processing is complete or failed, close the stream
            if (progressData.type === 'processing_complete' || progressData.type === 'processing_error') {
              clearInterval(pollInterval)
              // Clean up the stored data
              global.uploadProgress.delete(uploadId)
              controller.close()
            }
          }
        } catch (error) {
          console.error('SSE error:', error)
          clearInterval(pollInterval)
          controller.error(error)
        }
      }, 1000) // Poll every second

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        controller.close()
      })

      // Auto-close after 5 minutes to prevent hanging connections
      setTimeout(() => {
        clearInterval(pollInterval)
        controller.close()
      }, 5 * 60 * 1000)
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}