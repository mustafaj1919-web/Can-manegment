"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Locale } from "./dictionaries";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

/**
 * Global locale store (Zustand). Hydration from localStorage is deferred
 * (skipHydration + a manual rehydrate() call in I18nProvider's effect) so
 * the very first client render always matches the server-rendered "ar"
 * default — avoiding the hydration-mismatch class of bug entirely.
 */
export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: "ar",
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set((s) => ({ locale: s.locale === "ar" ? "en" : "ar" })),
    }),
    {
      name: "alsadaka-locale-store",
      skipHydration: true,
      partialize: (s) => ({ locale: s.locale }),
    },
  ),
);
