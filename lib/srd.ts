export interface ListItem {
  index: string;
  name: string;
  url: string;
}

const BASE_URL = 'https://www.dnd5eapi.co/api';

const raceTranslations: Record<string, string> = {
  dragonborn: '용족 (Dragonborn)',
  dwarf: '드워프 (Dwarf)',
  elf: '엘프 (Elf)',
  gnome: '노움 (Gnome)',
  'half-elf': '하프엘프 (Half-Elf)',
  'half-orc': '하프오크 (Half-Orc)',
  halfling: '하플링 (Halfling)',
  human: '인간 (Human)',
  tiefling: '티플링 (Tiefling)',
};

const classTranslations: Record<string, string> = {
  barbarian: '야만전사 (Barbarian)',
  bard: '바드 (Bard)',
  cleric: '클레릭 (Cleric)',
  druid: '드루이드 (Druid)',
  fighter: '파이터 (Fighter)',
  monk: '수도승 (Monk)',
  paladin: '팔라딘 (Paladin)',
  ranger: '레인저 (Ranger)',
  rogue: '로그 (Rogue)',
  sorcerer: '소서러 (Sorcerer)',
  warlock: '워락 (Warlock)',
  wizard: '위저드 (Wizard)',
};

const translateList = (items: ListItem[], table: Record<string, string>) =>
  items.map((item) => table[item.index] || table[item.name.toLowerCase()] || item.name);

export async function getRaces(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/races`);
  if (!res.ok) {
    throw new Error(`SRD API error: ${res.status}`);
  }
  const data = await res.json();
  return translateList(data.results as ListItem[], raceTranslations);
}

export async function getClasses(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/classes`);
  if (!res.ok) {
    throw new Error(`SRD API error: ${res.status}`);
  }
  const data = await res.json();
  return translateList(data.results as ListItem[], classTranslations);
}
