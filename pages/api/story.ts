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
  difficulty?: 'casual' | 'standard' | 'hard'
  chapter?: number
  chapterProgress?: number
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
  const { background, history, choice, combatResult, race, className, difficulty, chapter, chapterProgress } =
    req.body as ReqBody

  const traitLine = Array.isArray(req.body.traits) && req.body.traits.length > 0
    ? `보유 특성: ${req.body.traits.join(', ')}\n`
    : ''
  const characterLine = race && className ? `캐릭터는 ${race} ${className}입니다. ${traitLine}` : traitLine
  const progressionLine = typeof chapter === 'number'
    ? `현재 진행: 챕터 ${chapter} (진행도 ${chapterProgress ?? 0}/3)\n`
    : ''
  const difficultyLine = difficulty
    ? `선택된 난이도: ${difficulty}. 난이도에 맞춘 위험도/보상/회복 밸런스를 유지하세요.\n`
    : ''
  const basePrompt = background?.trim()
    ? `${background.trim()}\n${characterLine}${progressionLine}${difficultyLine}\n이전 대화:\n${history.join('\n')}`
    : `${characterLine}${progressionLine}${difficultyLine}\n이전 대화:\n${history.join('\n')}`
  const combatLine = combatResult
   ? `전투 결과: ${combatResult}\n`
   : "";
  const worldFrame = [
    '세계관 기본 틀:',
    '– 대륙 엘도라: 수도 루멘(인간 왕국), 카르둠(드워프 산악 요새), 아스트랄리움(비밀스러운 마법도시), 황혼늪(언데드와 저주가 도사리는 늪지).',
    '– 확장된 지역: 불꽃 사막 유적(봉인된 정령과 모래폭풍), 바람노래 평원(유랑 상단과 칸막이 부족), 흑요암 해안(해적 소굴·침몰선 묘지), 달무리 숲(고대 요정 회랑·환영), 수정 협곡(공명하는 마나 폭포·천공 미아), 용골 협만(고대 용의 무덤·안개 항로), 밤개울 늪지(반딧불 약초·늑대인간 은신처).',
    '– 숨은 거점과 여행지: 유리탑 천문대(별자리 예언), 바람을 쫓는 등대(난파선 수호령), 비취 시장(이계 상인과 금지된 장비), 균열 산맥 아래의 공허 틈(실험적 마도기관).',
    '– 중심 갈등: 쇠락한 봉인을 틈타 암흑 군주가 부활하려 하며, 봉인을 강화하려면 고대 성유물 조각 세 개(심장의 보석, 서리의 인장, 별빛 두루마리)를 모아야 합니다.',
    '– 주요 세력: 여명 기사단(왕국의 수호자), 서리망치 연맹(드워프 공학·무기 전문가), 청람 서클(마법사 집단), 그림자 길드(정보와 잠입 전문가), 변방의 수인 부족, 모래의 사도단(사막의 신비 의례), 해안의 검은 깃발 연합(해적·용병 연맹), 월광 궁정(요정 귀족과 숲의 맹약).',
    '',
    '진행 구조 틀:',
    '– 이야기 전체는 3장 구조(각 장당 3단계)로 이어집니다. chapter는 현재 장(1~3), chapterProgress는 단계(0~3)입니다.',
    '– 단계 정의: 0=장 도입·목표 설정, 1=탐색·정보 수집, 2=위기·전투·결정, 3=장 마무리·보상·다음 장 예고.',
    '– 각 응답에서 chapter와 chapterProgress에 맞춰 그 단계의 목적과 긴장을 명확히 보여주세요. 단계가 완료되면 다음 단계로 자연스럽게 연결하거나, chapterProgress가 3이면 다음 chapter의 도입을 준비하세요.',
    '– 성유물 조각 회수나 봉인 강화 등 장기 목표를 상기시키고, 주요 세력 중 최소 하나와의 관계 변화를 지속적으로 반영하세요.',
  ].join('\n')
  const styleGuide = `
당신은 중세 판타지 텍스트 어드벤처 게임의 내레이터입니다.
– 3인칭 서술, 감각 묘사, 캐릭터 심리 묘사 중심으로 작성하세요.
– 서사는 소설처럼 흐르도록 장면을 그리고, 짧은 대사나 은유·리듬감을 섞어 생동감을 살리세요.
– 문장이 단조롭지 않게 호흡을 조절하고, 장면 전환 시 한두 단어로 여운을 남기세요.
– 전투가 연속될 때는 짧은 이동·회복·긴장감 완화 묘사를 넣어 어색함 없이 다음 전투나 선택지로 이어가세요.
– 새 전투에 진입할 때는 isCombat을 곧바로 true로 만들지 말고, 준비·경고·포지셔닝 등 1~2문장의 서사를 먼저 제공해 플레이어가 읽고 선택한 뒤 전투로 넘어가게 하세요. 실제 전투 페이즈에만 isCombat을 true로 설정하세요.
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

${worldFrame}

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
