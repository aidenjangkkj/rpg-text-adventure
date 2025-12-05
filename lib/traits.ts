export type TraitBonusTarget =
  | "hp"
  | "energy"
  | "strength"
  | "dexterity"
  | "constitution";

export interface Trait {
  name: string;
  summary: string;
  bonuses: Partial<Record<TraitBonusTarget, number>>;
}

const raceTraits: Record<string, Trait> = {
  "용족 (Dragonborn)": {
    name: "용의 분노",
    summary: "타고난 용혈로 근력이 돋보이며 강인한 숨결을 품습니다.",
    bonuses: { strength: 3, energy: 5 },
  },
  "드워프 (Dwarf)": {
    name: "돌같은 인내",
    summary: "두터운 체력과 인내심으로 긴 전투에도 버팁니다.",
    bonuses: { hp: 12, constitution: 2 },
  },
  "엘프 (Elf)": {
    name: "예리한 감각",
    summary: "민첩한 반사신경과 기민한 스텝으로 위험을 피합니다.",
    bonuses: { dexterity: 3, energy: 10 },
  },
  "노움 (Gnome)": {
    name: "기민한 두뇌",
    summary: "호기심 많은 정신력으로 마법 에너지를 비축합니다.",
    bonuses: { energy: 12 },
  },
  "하프엘프 (Half-Elf)": {
    name: "다재다능",
    summary: "엘프와 인간의 장점을 고르게 이어받았습니다.",
    bonuses: { hp: 6, energy: 6 },
  },
  "하프오크 (Half-Orc)": {
    name: "잔혹한 힘",
    summary: "거친 체격으로 강력한 일격을 가합니다.",
    bonuses: { strength: 3, hp: 10 },
  },
  "하플링 (Halfling)": {
    name: "날렵한 발놀림",
    summary: "작은 체구로 민첩하게 움직이며 지구력을 아낍니다.",
    bonuses: { dexterity: 2, energy: 6 },
  },
  "인간 (Human)": {
    name: "적응력",
    summary: "어떤 환경에서도 스스로를 빠르게 단련합니다.",
    bonuses: { strength: 1, dexterity: 1, energy: 6 },
  },
  "티플링 (Tiefling)": {
    name: "지옥의 회복력",
    summary: "내재된 마력이 에너지를 끌어올립니다.",
    bonuses: { energy: 14 },
  },
};

const classTraits: Record<string, Trait> = {
  "야만전사 (Barbarian)": {
    name: "광전사의 분노",
    summary: "분노를 폭발시켜 체력과 근력이 상승합니다.",
    bonuses: { hp: 10, strength: 2 },
  },
  "바드 (Bard)": {
    name: "격려의 멜로디",
    summary: "노래로 정신을 북돋아 에너지를 회복합니다.",
    bonuses: { energy: 8 },
  },
  "클레릭 (Cleric)": {
    name: "신성한 축복",
    summary: "신의 은총이 체력과 체질을 보강합니다.",
    bonuses: { hp: 8, constitution: 2 },
  },
  "드루이드 (Druid)": {
    name: "자연의 숨결",
    summary: "자연과 교감하며 에너지를 안정적으로 끌어옵니다.",
    bonuses: { energy: 10, dexterity: 1 },
  },
  "파이터 (Fighter)": {
    name: "숙련된 전투술",
    summary: "훈련된 전투 감각으로 균형 잡힌 능력을 보입니다.",
    bonuses: { hp: 6, strength: 2, dexterity: 1 },
  },
  "수도승 (Monk)": {
    name: "기의 흐름",
    summary: "호흡을 다스려 에너지 소모를 줄입니다.",
    bonuses: { energy: 9, dexterity: 2 },
  },
  "팔라딘 (Paladin)": {
    name: "정의의 맹세",
    summary: "신성한 힘이 체력을 지탱하고 공격을 보강합니다.",
    bonuses: { hp: 8, strength: 2 },
  },
  "레인저 (Ranger)": {
    name: "사냥꾼의 직감",
    summary: "원거리 감각과 지구력이 향상됩니다.",
    bonuses: { dexterity: 3, energy: 8 },
  },
  "로그 (Rogue)": {
    name: "은신과 기민함",
    summary: "재빠른 움직임으로 공격 기회를 노립니다.",
    bonuses: { dexterity: 4, energy: 6 },
  },
  "소서러 (Sorcerer)": {
    name: "선천적 마법",
    summary: "타고난 마력이 에너지를 빠르게 모읍니다.",
    bonuses: { energy: 15 },
  },
  "워락 (Warlock)": {
    name: "계약의 힘",
    summary: "계약으로 얻은 마력이 지구력을 보충합니다.",
    bonuses: { energy: 12 },
  },
  "위저드 (Wizard)": {
    name: "학자의 통찰",
    summary: "연구로 쌓은 마력 축적이 에너지를 높입니다.",
    bonuses: { energy: 15 },
  },
};

export function getRaceTrait(name: string): Trait | null {
  return raceTraits[name] ?? null;
}

export function getClassTrait(name: string): Trait | null {
  return classTraits[name] ?? null;
}

export function formatTraitBonuses(trait: Trait | null): string {
  if (!trait) return "";
  const parts = Object.entries(trait.bonuses).map(([k, v]) => `${k} +${v}`);
  return parts.length > 0 ? parts.join(", ") : "";
}
