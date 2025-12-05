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
  traits?: string[]
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

  const traitLine = Array.isArray(req.body.traits) && req.body.traits.length > 0
    ? `보유 특성: ${req.body.traits.join(', ')}\n`
    : ''
  const characterLine = race && className ? `캐릭터는 ${race} ${className}입니다. ${traitLine}` : traitLine
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
– 스토리는 한국어로 3~5문장, 각 선택지는 5~20자로 간결하게 작성하세요.
– 선택지 수는 2~3개로 유지하고, 전투 상황이 아니면 isCombat을 false로 설정하세요.
`

  const jsonDirective = `
반드시 순수 JSON만 출력해주세요. story의 문장은 마침표 기준으로 분리하고, Markdown·설명 텍스트를 포함하지 마세요.
형식:
{
  "story": "...",
  "choices": ["...","..."],
  "isCombat": true|false,
  "dangerLevel": "low"|"medium"|"high",
  "enemyLevel": number,
  "buffs": [ { "target": "hp"|"strength"|"dexterity"|"constitution"|"energy", "amount": number } ]
}
isCombat가 true라면 전투 상황이어야 하며, dangerLevel과 enemyLevel을 함께 지정하세요.
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
