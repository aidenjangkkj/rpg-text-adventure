// lib/gemini.ts
import { GoogleGenAI } from '@google/genai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY in .env.local')
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function generateWithGemini(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  })

  // undefined 또는 빈 문자열인 경우 에러 처리
  const text = response.text ?? ''
  if (!text.trim()) {
    throw new Error('Gemini API returned empty response')
  }

  return text
}
