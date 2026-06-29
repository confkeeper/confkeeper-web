import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorSettingsState {
    fontSize: number;
    setFontSize: (fontSize: number) => void;
}

export const useEditorSettingsStore = create<EditorSettingsState>()(
    persist(
        (set) => ({
            fontSize: 12,
            setFontSize: (fontSize) => set({fontSize}),
        }),
        {
            name: 'editorSettings',
            partialize: (state) => ({fontSize: state.fontSize}),
        }
    )
);
