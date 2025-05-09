// pages/api/story.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { generateWithGemini } from '@/lib/gemini'

interface ReqBody {
  background?: string
  history: string[]
  choice: string
  combatResult: string
}
interface ResBody {
  story?: string
  choices?: string[]
  isCombat?: boolean
  dangerLevel?: string
  rewards?: { gold: number; items: string[] }
  enemyLevel?: number
  buffs?: { target: 'hp'|'strength'|'dexterity'|'constitution'; amount: number }[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResBody>
) {
  const { background, history, choice,combatResult } = req.body as ReqBody

  const basePrompt = background?.trim()
    ? `${background.trim()}\n\n이전 대화:\n${history.join('\n')}`
    : `이전 대화:\n${history.join('\n')}`
  const combatLine = combatResult
   ? `전투 결과: ${combatResult}\n`
   : "";
  const styleGuide = `
당신은 중세 판타지 텍스트 어드벤처 게임의 내레이터입니다.
– 3인칭 서술, 감각 묘사, 캐릭터 심리 묘사 중심으로 작성하세요.
– 전투, 위험도, 보상, 적 수준, 버프 정보를 JSON으로 반환해야 합니다.
`

  const jsonDirective = `
반드시 순수 JSON만 출력해주세요. isCombat의 경우 선택지에 따라 설정해야합니다. 형식:
{
  "story": "...",
  "choices": ["...","..."],
  "isCombat": true|false,
  "dangerLevel": "low"|"medium"|"high",
  "enemyLevel": number,
  "buffs": [ { "target": "hp"|"strength"|"dexterity"|"constitution", "amount": number } ]
}
`

  const prompt = `
${styleGuide}
${jsonDirective}

${basePrompt}
${combatLine}
선택: ${choice || '없음'}
다음 이야기를 JSON 형식으로 생성해 주세요.
`

  try {
    const raw = await generateWithGemini(prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 응답에 JSON 포맷이 없습니다.')

    const parsed = JSON.parse(match[0]) as Omit<ResBody, 'error'>
    return res.status(200).json(parsed)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
