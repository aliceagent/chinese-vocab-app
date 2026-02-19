import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

const UPLOAD_DIR = '/tmp/chinese-vocab-uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Validate file type
function validateFileType(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx']
  const ext = path.extname(filename).toLowerCase()
  return allowedExtensions.includes(ext)
}

// Get file type from filename
function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!validateFileType(file.name)) {
      return NextResponse.json(
        { success: false, error: 'File type not supported. Please upload PDF, DOC, DOCX, or TXT files.' },
        { status: 400 }
      )
    }

    // Generate unique filename and storage key
    const uploadId = randomUUID()
    const fileExtension = path.extname(file.name)
    const storageKey = `${uploadId}${fileExtension}`
    const filePath = path.join(UPLOAD_DIR, storageKey)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create database record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        id: uploadId,
        userId: 'demo-user', // TODO: Get from session/auth
        originalFilename: file.name,
        fileSize: file.size,
        fileType: getFileType(file.name),
        storageKey,
        processingStatus: 'pending'
      }
    })

    // Start background processing
    processFileInBackground(uploadId, filePath, file.name)

    return NextResponse.json({
      success: true,
      data: fileUpload,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    )
  }
}

// Background processing function
async function processFileInBackground(uploadId: string, filePath: string, originalFilename: string) {
  try {
    // Update status to processing
    await prisma.fileUpload.update({
      where: { id: uploadId },
      data: { processingStatus: 'processing' }
    })

    // Broadcast processing start via WebSocket (if connected)
    broadcastToWebSocket(uploadId, {
      type: 'processing_start',
      uploadId,
      filename: originalFilename
    })

    // Simulate processing with progress updates
    const steps = [
      { progress: 0.1, message: 'Reading file...' },
      { progress: 0.3, message: 'Extracting text...' },
      { progress: 0.5, message: 'Identifying Chinese characters...' },
      { progress: 0.7, message: 'Looking up definitions...' },
      { progress: 0.9, message: 'Creating vocabulary list...' }
    ]

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate work
      
      broadcastToWebSocket(uploadId, {
        type: 'processing_progress',
        progress: step.progress,
        message: step.message
      })
    }

    // Create vocabulary list (simplified for demo)
    const vocabularyList = await prisma.vocabularyList.create({
      data: {
        id: randomUUID(),
        userId: 'demo-user',
        name: `Vocabulary from ${originalFilename}`,
        description: `Extracted vocabulary from uploaded file: ${originalFilename}`,
        sourceFileName: originalFilename,
        totalWords: 0,
        hskDistribution: {
          hsk1: 0,
          hsk2: 0,
          hsk3: 0,
          hsk4: 0,
          hsk5: 0,
          hsk6: 0
        }
      }
    })

    // Update file upload record
    const updatedUpload = await prisma.fileUpload.update({
      where: { id: uploadId },
      data: {
        processingStatus: 'completed',
        vocabularyListId: vocabularyList.id,
        processedAt: new Date()
      }
    })

    // Broadcast completion
    broadcastToWebSocket(uploadId, {
      type: 'processing_complete',
      upload: updatedUpload,
      vocabularyList
    })

  } catch (error) {
    console.error('Processing error:', error)
    
    // Update status to failed
    await prisma.fileUpload.update({
      where: { id: uploadId },
      data: {
        processingStatus: 'failed',
        processingError: error instanceof Error ? error.message : 'Processing failed'
      }
    })

    // Broadcast error
    broadcastToWebSocket(uploadId, {
      type: 'processing_error',
      error: error instanceof Error ? error.message : 'Processing failed'
    })
  }
}

// WebSocket broadcast (placeholder - would need WebSocket server setup)
function broadcastToWebSocket(uploadId: string, data: any) {
  // In a real implementation, you would:
  // 1. Keep track of WebSocket connections by uploadId
  // 2. Send the data to connected clients
  console.log(`WebSocket broadcast for ${uploadId}:`, data)
  
  // For now, store the data in a simple in-memory store
  // that the WebSocket endpoint can poll
  if (typeof global !== 'undefined') {
    if (!global.uploadProgress) {
      global.uploadProgress = new Map()
    }
    global.uploadProgress.set(uploadId, data)
  }
}