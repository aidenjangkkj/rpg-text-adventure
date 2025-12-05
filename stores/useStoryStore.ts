// stores/useStoryStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StoryState {
  history: string[];
  choice: string;
  loading: boolean;
  error: string | null;
  playerHp: number;
  playerLevel: number;
  energy: number;
  buffs: Record<string, number>;
  story: string;
  choices: string[];
  race: string;
  className: string;
  traits: string[];
  difficulty: 'casual' | 'standard' | 'hard';
  chapter: number;
  chapterProgress: number;
  dangerLevel: string;
  setDangerLevel: (dl: string) => void;
  setStory: (s: string) => void;
  setChoices: (c: string[]) => void;
  addHistory: (line: string) => void;
  setChoice: (ch: string) => void;
  setLoading: (flag: boolean) => void;
  setError: (msg: string | null) => void;
  setPlayerHp: (hp: number) => void;
  setPlayerLevel: (level: number) => void;
  setEnergy: (energy: number) => void;
  setBuffs: (buffs: Record<string, number>) => void;
  setRace: (race: string) => void;
  setClassName: (cls: string) => void;
  setTraits: (traits: string[]) => void;
  setDifficulty: (difficulty: 'casual' | 'standard' | 'hard') => void;
  setChapter: (chapter: number) => void;
  setChapterProgress: (value: number) => void;
}

export const useStoryStore = create<StoryState>()(
  persist(
    (set) => ({
      history: [],
      choice: "",
      loading: false,
      error: null,

      // ▶ 플레이어 상태
      playerHp: 100,
      playerLevel: 1,
      energy: 100,
      buffs: {
        hp: 0,
        strength: 0,
        dexterity: 0,
        constitution: 0,
        energy: 0,
      },
      race: '',
      className: '',
      traits: [],
      difficulty: 'standard',
      chapter: 1,
      chapterProgress: 0,
      story: "",
      choices: [],
      dangerLevel: '',
      setDangerLevel: (dl) => set({ dangerLevel: dl }),
      setStory: (s) => set({ story: s }),
      setChoices: (c) => set({ choices: c }),
      // ▶ 액션들
      addHistory: (line) =>
        set((state) => {
          const next = [...state.history, line].slice(-40)
          return { history: next }
        }),
      setChoice: (ch) => set({ choice: ch }),
      setLoading: (flag) => set({ loading: flag }),
      setError: (msg) => set({ error: msg }),

      // ▶ 플레이어 상태 변경
      setPlayerHp: (hp) => set({ playerHp: hp }),
      setPlayerLevel: (level) => set({ playerLevel: level }),
      setEnergy: (energy) => set({ energy }),
      setBuffs: (buffs) => set({ buffs }),
      setRace: (race) => set({ race }),
      setClassName: (cls) => set({ className: cls }),
      setTraits: (traits) => set({ traits }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setChapter: (chapter) => set({ chapter }),
      setChapterProgress: (value) => set({ chapterProgress: value }),
    }),
    {
      name: "story-store",
      // 사용자 환경에서만 localStorage 사용
      storage: createJSONStorage(() => localStorage),
    }
  )
);
