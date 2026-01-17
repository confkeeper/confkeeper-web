import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DemoStatusState {
  is_demo: boolean;
  setDemoStatus: (is_demo: boolean) => void;
}

export const demoStatusStore = create<DemoStatusState>()(
  persist(
    (set) => ({
        is_demo: false,
        setDemoStatus: (is_demo) => set({ is_demo }),
    }),
    {
      name: 'demoStatus',
      partialize: (state) => ({ is_demo: state.is_demo }),
    }
  )
);
