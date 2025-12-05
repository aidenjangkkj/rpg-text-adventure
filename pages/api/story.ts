// pages/api/story.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { generateWithGemini } from '@/lib/gemini'

interface ReqBody {
  background?: string
  history: string[]
  choice: string
  combatResult: string
  race?: string
  className?: string
}
interface ResBody {
  story?: string
  choices?: string[]
  isCombat?: boolean
  dangerLevel?: string
  enemyLevel?: number
  buffs?: { target: 'hp'|'strength'|'dexterity'|'constitution'|'energy'; amount: number }[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResBody>
) {
  const { background, history, choice, combatResult, race, className } =
    req.body as ReqBody

  const characterLine = race && className ? `캐릭터는 ${race} ${className}입니다.` : ''
  const basePrompt = background?.trim()
    ? `${background.trim()}\n${characterLine}\n\n이전 대화:\n${history.join('\n')}`
    : `${characterLine}\n이전 대화:\n${history.join('\n')}`
  const combatLine = combatResult
   ? `전투 결과: ${combatResult}\n`
   : "";
  const styleGuide = `
당신은 중세 판타지 텍스트 어드벤처 게임의 내레이터입니다.
– 3인칭 서술, 감각 묘사, 캐릭터 심리 묘사 중심으로 작성하세요.
– 전투, 위험도, 보상, 적 수준, 버프 정보를 JSON으로 반환해야 합니다.
`

  const jsonDirective = `
반드시 순수 JSON만 출력해주세요. isCombat의 경우 선택지에 따라 설정해야합니다. story의 경우 문장을 마침표를 기준으로 나누어야 합니다.
형식:
{
  "story": "...",
  "choices": ["...","..."],
  "isCombat": true|false,
  "dangerLevel": "low"|"medium"|"high",
  "enemyLevel": number,
  "buffs": [ { "target": "hp"|"strength"|"dexterity"|"constitution"|"energy", "amount": number } ]
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
    const safeStory = typeof parsed.story === 'string' && parsed.story.trim().length > 0
      ? parsed.story
      : '새로운 이야기를 불러오는 데 실패했습니다. 호흡을 가다듬고 다시 시도하세요.'
    const safeChoices = Array.isArray(parsed.choices)
      ? parsed.choices.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : []
    const safeBuffs = Array.isArray(parsed.buffs)
      ? parsed.buffs.filter(
          (buff): buff is NonNullable<ResBody['buffs']>[number] =>
            !!buff && typeof buff.target === 'string' && typeof buff.amount === 'number'
        )
      : []

    return res.status(200).json({
      story: safeStory,
      choices: safeChoices,
      isCombat: Boolean(parsed.isCombat),
      dangerLevel: typeof parsed.dangerLevel === 'string' ? parsed.dangerLevel : 'low',
      enemyLevel:
        typeof parsed.enemyLevel === 'number' && Number.isFinite(parsed.enemyLevel)
          ? parsed.enemyLevel
          : 1,
      buffs: safeBuffs,
    })
  } catch (err: unknown) {
    console.error(err);
    // unknown 에러를 안전하게 처리
    const message = err instanceof Error ? err.message : String(err);
    res.status(200).json({
      story: '이야기를 가져오는 동안 문제가 발생했습니다. 안전한 경로로 계속 진행하세요.',
      choices: ['숨 고르기', '조심스럽게 계속 이동'],
      isCombat: false,
      dangerLevel: 'low',
      enemyLevel: 1,
      buffs: [],
      error: message,
    });
}
}
