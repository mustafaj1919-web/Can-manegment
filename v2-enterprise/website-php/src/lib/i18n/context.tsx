"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dictionaries, type Locale, type Dictionary } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "alsadaka-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "en" || stored === "ar") {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", locale);
    html.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggleLocale = useCallback(() => setLocaleState((prev) => (prev === "ar" ? "en" : "ar")), []);

  const value: I18nContextValue = {
    locale,
    dict: dictionaries[locale],
    dir: locale === "ar" ? "rtl" : "ltr",
    setLocale,
    toggleLocale,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
