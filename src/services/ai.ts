import { AiProvider } from '../utils/storage'

type OpenAIResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

export async function callOpenAIChat(prompt: string, apiKey: string, provider: AiProvider = 'openai') {
  // Use Chat Completions API with a clear instruction to return a JSON block
  const body = {
    model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a strict JSON generator for an RPG app. Respond only with a JSON object between markers JSON_START and JSON_END.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.6,
    max_tokens: 800
  }

  const endpoint = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions'
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`OpenAI error: ${resp.status} ${txt}`)
  }

  const data = (await resp.json()) as OpenAIResponse
  const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message!.content || '' : ''
  return content
}
