"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PreferenceState {
  uiVersion: "new" | "legacy";
  setUiVersion: (v: "new" | "legacy") => void;
  legacyThemeMode: string;
  legacyThemePalette: string;
  setLegacyTheme: (mode: string, palette: string) => void;
  newUiAccent: string;
  setNewUiAccent: (accent: string) => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      uiVersion: "new",
      legacyThemeMode: "signal",
      legacyThemePalette: "blue",
      newUiAccent: "white",

      setUiVersion: (v) => set({ uiVersion: v }),
      setLegacyTheme: (mode, palette) => set({ legacyThemeMode: mode, legacyThemePalette: palette }),
      setNewUiAccent: (accent) => set({ newUiAccent: accent }),
    }),
    {
      name: "timix-preferences-v1",
      partialize: (state) => ({
        uiVersion: state.uiVersion,
        legacyThemeMode: state.legacyThemeMode,
        legacyThemePalette: state.legacyThemePalette,
        newUiAccent: state.newUiAccent,
      }),
    },
  ),
);
