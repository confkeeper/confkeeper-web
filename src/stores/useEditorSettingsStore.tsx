import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorSettingsState {
    fontSize: number;
    setFontSize: (fontSize: number) => void;
}

export const editorSettingsStore = create<EditorSettingsState>()(
    persist(
        (set) => ({
            fontSize: 14,
            setFontSize: (fontSize) => set({fontSize}),
        }),
        {
            name: 'editorSettings',
            partialize: (state) => ({fontSize: state.fontSize}),
        }
    )
);
