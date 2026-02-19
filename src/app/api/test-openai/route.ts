/**
 * OpenAI API Key Verification Route
 * 
 * This is a temporary testing route to verify OpenAI API key configuration.
 * 
 * Usage:
 * 1. Deploy this route
 * 2. Visit: https://your-app.vercel.app/api/test-openai
 * 3. Verify the response shows successful OpenAI connection
 * 4. DELETE this file after verification for security
 * 
 * Expected Response (Success):
 * {
 *   "success": true,
 *   "keyConfigured": true,
 *   "modelsCount": 100+,
 *   "hasGPT4": true,
 *   "canGenerateText": true
 * }
 */

import { NextResponse } from 'next/server'

// Only import OpenAI if the route is accessed (lazy loading)
let OpenAI: any = null

export async function GET() {
  try {
    // Check if API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY environment variable not found',
        keyConfigured: false,
        suggestions: [
          'Add OPENAI_API_KEY to Vercel environment variables',
          'Trigger a new deployment after adding the variable',
          'Verify the variable is set for the correct environment (production/preview)'
        ]
      }, { status: 500 })
    }

    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key format (should start with sk-)',
        keyConfigured: false,
        suggestions: [
          'Verify API key is copied correctly from OpenAI dashboard',
          'Ensure no extra spaces or characters in the environment variable'
        ]
      }, { status: 500 })
    }

    // Lazy load OpenAI SDK
    if (!OpenAI) {
      OpenAI = (await import('openai')).default
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Test 1: List available models
    const modelsResponse = await openai.models.list()
    const models = modelsResponse.data
    
    const hasGPT35 = models.some((model: any) => model.id.includes('gpt-3.5'))
    const hasGPT4 = models.some((model: any) => model.id.includes('gpt-4'))

    // Test 2: Simple text generation test
    let canGenerateText = false
    let generationError = null
    
    try {
      const testResponse = await openai.chat.completions.create({
        model: hasGPT4 ? "gpt-4" : "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "Say 'Hello' in Chinese with pinyin and English translation. Keep it brief."
          }
        ],
        max_tokens: 50
      })
      
      canGenerateText = true
      
      return NextResponse.json({
        success: true,
        keyConfigured: true,
        modelsCount: models.length,
        hasGPT35,
        hasGPT4,
        canGenerateText,
        testGeneration: testResponse.choices[0].message.content,
        usage: testResponse.usage,
        timestamp: new Date().toISOString(),
        warning: '⚠️  DELETE this test route after verification for security!'
      })
      
    } catch (genError: any) {
      generationError = genError.message
      
      return NextResponse.json({
        success: false,
        keyConfigured: true,
        modelsCount: models.length,
        hasGPT35,
        hasGPT4,
        canGenerateText: false,
        error: `Text generation failed: ${generationError}`,
        suggestions: [
          'Check OpenAI account billing status',
          'Verify API key has sufficient quota',
          'Ensure API key has access to chat models'
        ]
      }, { status: 500 })
    }

  } catch (error: any) {
    // Handle different types of API errors
    let errorMessage = error.message
    let suggestions: string[] = []

    if (error.code === 'invalid_api_key') {
      errorMessage = 'Invalid API key provided'
      suggestions = [
        'Verify API key is correct in Vercel environment variables',
        'Generate a new API key in OpenAI dashboard if needed',
        'Ensure API key has not been revoked'
      ]
    } else if (error.code === 'insufficient_quota') {
      errorMessage = 'OpenAI account has insufficient quota'
      suggestions = [
        'Add billing information to OpenAI account',
        'Check current usage and limits in OpenAI dashboard',
        'Wait for quota reset or upgrade plan'
      ]
    } else if (error.code === 'rate_limit_exceeded') {
      errorMessage = 'Rate limit exceeded'
      suggestions = [
        'Wait a moment before retrying',
        'Implement rate limiting in application',
        'Consider upgrading OpenAI tier'
      ]
    }

    return NextResponse.json({
      success: false,
      keyConfigured: !!process.env.OPENAI_API_KEY,
      error: errorMessage,
      errorCode: error.code || 'unknown',
      suggestions,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Optional: Add a simple HTML interface for manual testing
export async function OPTIONS() {
  return NextResponse.json({
    message: 'OpenAI API Test Route',
    usage: 'Send GET request to test OpenAI API key configuration',
    warning: 'This is a testing route. Remove after verification.',
    endpoints: {
      test: 'GET /api/test-openai'
    }
  })
}