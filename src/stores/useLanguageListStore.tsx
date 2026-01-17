import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LanguageListState {
  languages: string[];
  setLanguageList: (languages: string[]) => void;
}

export const languageListStore = create<LanguageListState>()(
  persist(
    (set) => ({
        languages: [],
        setLanguageList: (languages) => set({ languages }),
    }),
    {
      name: 'languageList',
      partialize: (state) => ({ languages: state.languages }),
    }
  )
);
