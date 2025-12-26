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
  buffs?: { target: 'hp' | 'strength' | 'dexterity' | 'constitution' | 'energy'; amount: number }[]
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResBody>) {
  const {
    background,
    history,
    choice,
    combatResult,
    race,
    className,
    traits,
    difficulty,
    chapter,
    chapterProgress,
  } = req.body as ReqBody

  const truncateTail = (text: string, maxLength: number) =>
    text.length > maxLength ? text.slice(text.length - maxLength) : text

  const BACKGROUND_LIMIT = 800
  const HISTORY_LIMIT = 1800
  const MIN_HISTORY_LIMIT = 400
  const PROMPT_LIMIT = 4000

  const traitLine =
    Array.isArray(traits) && traits.length > 0 ? `보유 특성: ${traits.join(', ')}\n` : ''
  const characterLine =
    race && className ? `캐릭터는 ${race} ${className}입니다. ${traitLine}` : traitLine
  const progressionLine =
    typeof chapter === 'number'
      ? `현재 진행: 챕터 ${chapter} (진행도 ${chapterProgress ?? 0}/3)\n`
      : ''
  const difficultyLine = difficulty
    ? `선택된 난이도: ${difficulty}. 난이도에 맞춘 위험도/보상/회복 밸런스를 유지하세요.\n`
    : ''
  const combatLine = combatResult ? `전투 결과: ${combatResult}\n` : ''

  const limitHistory = (entries: string[], maxLength: number) => {
    const acc: string[] = []
    let total = 0

    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const line = entries[i]
      const nextLength = total + line.length + (acc.length ? 1 : 0)
      if (nextLength > maxLength) break

      acc.push(line)
      total = nextLength
    }

    return acc.reverse()
  }

  const trimmedBackground = background?.trim()
    ? truncateTail(background.trim(), BACKGROUND_LIMIT)
    : ''

  const buildBase = (historyLimit: number) => {
    const trimmedHistory = limitHistory(Array.isArray(history) ? history : [], historyLimit)
    const historyNote =
      Array.isArray(history) && history.length > trimmedHistory.length
        ? '(최근 대화 일부만 포함됨 — 누락된 맥락은 직전 흐름을 유지하며 자연스럽게 이어 쓰세요.)\n'
        : ''

    const basePrompt = trimmedBackground
      ? `${trimmedBackground}\n${characterLine}${progressionLine}${difficultyLine}\n${historyNote}이전 대화:\n${trimmedHistory.join(
          '\n'
        )}`
      : `${characterLine}${progressionLine}${difficultyLine}\n${historyNote}이전 대화:\n${trimmedHistory.join(
          '\n'
        )}`

    return { basePrompt, trimmedHistory, historyNote }
  }

  let { basePrompt } = buildBase(HISTORY_LIMIT)

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
– 새 전투로 진입할 때는 isCombat을 true로 설정하고, 1~2문장의 전투 진입 서사를 story에 담아 전투 화면에서 바로 보여줄 수 있게 하세요. 이때 choices는 빈 배열로 두어 선택지를 제시하지 않습니다.
– 전투, 위험도, 보상, 적 수준, 버프 정보를 JSON으로 반환해야 합니다.
– 스토리는 한국어로 3~5문장, 전투가 아닐 때만 선택지를 2~3개(각 5~20자) 제시하세요. 전투 상황(isCombat=true)에서는 choices를 빈 배열로 두세요.
– 전투 상황이 아니면 isCombat을 false로 설정하세요.
`.trim()

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
isCombat가 true라면 전투 상황이어야 하며, dangerLevel과 enemyLevel을 함께 지정하세요. 전투 상황에서는 choices를 빈 배열로 두세요.
`.trim()

  const makePrompt = (base: string) => `
${styleGuide}
${jsonDirective}

${worldFrame}

${base}
${combatLine}
선택: ${choice || '없음'}
다음 이야기를 JSON 형식으로 생성해 주세요.
`.trim()

  // 1차 프롬프트 생성
  let prompt = makePrompt(basePrompt)

  // 예산 초과 시 history 길이 재조정 (중복 제거)
  let over = prompt.length - PROMPT_LIMIT
  if (over > 0) {
    const adjustedHistoryLimit = Math.max(MIN_HISTORY_LIMIT, HISTORY_LIMIT - over - 200)
    const rebuilt = buildBase(adjustedHistoryLimit)
    basePrompt = rebuilt.basePrompt
    prompt = makePrompt(basePrompt)

    // 그래도 초과면(스타일/월드프레임이 긴 케이스) 마지막 방어로 한 번 더 줄임
    over = prompt.length - PROMPT_LIMIT
    if (over > 0) {
      const adjustedHistoryLimit2 = Math.max(MIN_HISTORY_LIMIT, adjustedHistoryLimit - over - 200)
      const rebuilt2 = buildBase(adjustedHistoryLimit2)
      basePrompt = rebuilt2.basePrompt
      prompt = makePrompt(basePrompt)
    }
  }

  try {
    const raw = await generateWithGemini(prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 응답에 JSON 포맷이 없습니다.')

    const parsed = JSON.parse(match[0]) as Omit<ResBody, 'error'>

    const safeStory =
      typeof parsed.story === 'string' && parsed.story.trim().length > 0
        ? parsed.story
        : '새로운 이야기를 불러오는 데 실패했습니다. 호흡을 가다듬고 다시 시도하세요.'

    const safeChoices = parsed.isCombat
      ? []
      : Array.isArray(parsed.choices)
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
    console.error(err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(200).json({
      story: '이야기를 가져오는 동안 문제가 발생했습니다. 안전한 경로로 계속 진행하세요.',
      choices: ['숨 고르기', '조심스럽게 계속 이동'],
      isCombat: false,
      dangerLevel: 'low',
      enemyLevel: 1,
      buffs: [],
      error: message,
    })
  }
}
