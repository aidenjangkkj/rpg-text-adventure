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
  buffs: Record<string, number>;
  story: string;
  choices: string[];
  dangerLevel: string
  setDangerLevel: (dl: string) => void
  setStory: (s: string) => void;
  setChoices: (c: string[]) => void;
  addHistory: (line: string) => void;
  setChoice: (ch: string) => void;
  setLoading: (flag: boolean) => void;
  setError: (msg: string | null) => void;
  setPlayerHp: (hp: number) => void;
  setPlayerLevel: (level: number) => void;
  setBuffs: (buffs: Record<string, number>) => void;
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
      buffs: {
        hp: 0,
        strength: 0,
        dexterity: 0,
        constitution: 0,
      },
      story: "",
      choices: [],
      dangerLevel: '', 
      setDangerLevel: (dl) => set({ dangerLevel: dl }),
      setStory: (s) => set({ story: s }),
      setChoices: (c) => set({ choices: c }),
      // ▶ 액션들
      addHistory: (line) =>
        set((state) => ({ history: [...state.history, line] })),
      setChoice: (ch) => set({ choice: ch }),
      setLoading: (flag) => set({ loading: flag }),
      setError: (msg) => set({ error: msg }),

      // ▶ 플레이어 상태 변경
      setPlayerHp: (hp) => set({ playerHp: hp }),
      setPlayerLevel: (level) => set({ playerLevel: level }),
      setBuffs: (buffs) => set({ buffs }),
    }),
    {
      name: "story-store",
      // 사용자 환경에서만 localStorage 사용
      storage: createJSONStorage(() => localStorage),
    }
  )
);
