import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 })
    }
    
    // Lazy load OpenAI
    const OpenAIClass = (await import('openai')).default
    const openai = new OpenAIClass({ apiKey })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
      max_tokens: 5,
      temperature: 0
    })
    
    return NextResponse.json({ 
      ok: true, 
      response: completion.choices[0].message.content 
    })
  } catch (e) {
    return NextResponse.json({ 
      error: e instanceof Error ? e.message : String(e),
      name: e instanceof Error ? e.constructor.name : 'unknown'
    }, { status: 500 })
  }
}
