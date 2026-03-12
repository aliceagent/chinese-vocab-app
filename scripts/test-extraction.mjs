import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Simulated PDF text from J's upload
const extractedText = `2026.2.24 下雪 le 了 。 前 天 the day before yesterday 前 年 the year before last year 我讲给你听 明天早上我要乘早班的飞机回特拉维夫。 我想在假日的时候跟我的 家人在一起。 下 le 了 一整天的雪。 在游轮上我呆 le 了 一整天。 一整天 餐厅一整天都开放。 一整天我在游轮上吃东西。我一整天在工作。 7-11 便利店 convenient store 便利店整天开放。 会 议 持 续 （ continue/sustain ） le 了 一整天。 我把杯子拿过来。听装饮料/易拉罐饮料 canned drinks 罐装玉米 canned corn 罐装金枪鱼 金枪鱼罐头 canned tuna 我们把所有装在罐里的食 物叫做罐头。 玻璃 glass`

async function test() {
  console.log('Testing OpenAI extraction...')
  console.log('Text length:', extractedText.length)
  console.log('---')
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a Chinese language expert. Extract all Chinese vocabulary words and phrases from the provided text. Return ONLY a valid JSON array with no other text.'
      },
      {
        role: 'user',
        content: `Extract all Chinese vocabulary from this text. Return a JSON array only:\n[{"hanzi":"汉字","pinyin":"pīnyīn","english":"meaning"}]\n\nText:\n${extractedText.slice(0, 8000)}`
      }
    ],
    temperature: 0.1,
    max_tokens: 2000
  })

  console.log('Raw response:')
  console.log(completion.choices[0].message.content)
  console.log('---')

  try {
    const raw = completion.choices[0].message.content?.trim() || ''
    const match = raw.match(/\[[\s\S]*\]/)
    const items = JSON.parse(match ? match[0] : raw)
    console.log(`Parsed ${items.length} items:`)
    items.forEach((item, i) => {
      console.log(`${i+1}. ${item.hanzi} (${item.pinyin}) - ${item.english}`)
    })
  } catch (e) {
    console.error('Parse error:', e.message)
  }
}

test().catch(console.error)
