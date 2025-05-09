// stores/useStoryStore.ts
import {create} from 'zustand'
import { persist } from 'zustand/middleware'

interface StoryState {
  history: string[]
  choice: string
  loading: boolean
  error: string | null
  addHistory: (line: string) => void
  setChoice: (ch: string) => void
  setLoading: (flag: boolean) => void
  setError: (msg: string | null) => void
}

export const useStoryStore = create<StoryState>()(
  persist(
    (set) => ({
      history: [],
      choice: '',
      loading: false,
      error: null,
      addHistory: (line) => set((s) => ({ history: [...s.history, line] })),
      setChoice: (ch) => set({ choice: ch }),
      setLoading: (flag) => set({ loading: flag }),
      setError: (msg) => set({ error: msg }),
    }),
    { name: 'story-store' }
  )
)
