import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Language, Translations } from "./types";
import { en } from "./locales/en";
import { it } from "./locales/it";

const LANGUAGE_STORAGE_KEY = "app_language";

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  detectedSystemLanguage: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatPrice: (cents: number | null) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: string | Date | null) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const detectSystemLanguage = (): { detectedLang: Language; rawCode: string } => {
  try {
    const raw =
      (typeof navigator !== "undefined" &&
        (navigator.language || (navigator.languages && navigator.languages[0]))) ||
      "en";
    const isItalian = raw.toLowerCase().startsWith("it");
    return {
      detectedLang: isItalian ? "it" : "en",
      rawCode: raw,
    };
  } catch {
    return { detectedLang: "en", rawCode: "en" };
  }
};

const getInitialLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "it" || saved === "en") {
      return saved;
    }
  } catch {
    // ignore localStorage errors
  }
  return detectSystemLanguage().detectedLang;
};

const dictionaries: Record<Language, Translations> = { en, it };

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const systemInfo = useMemo(() => detectSystemLanguage(), []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Nested key resolver, e.g. t("inventory.uniqueCards") or t("nav.dashboard")
  const t = useMemo(() => {
    const activeDict = dictionaries[language] || en;
    const fallbackDict = en;

    return (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let val: unknown = activeDict;
      for (const k of keys) {
        if (val && typeof val === "object" && k in val) {
          val = (val as Record<string, unknown>)[k];
        } else {
          val = undefined;
          break;
        }
      }

      // Fallback to English if key missing in current language
      if (typeof val !== "string") {
        let fallbackVal: unknown = fallbackDict;
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === "object" && k in fallbackVal) {
            fallbackVal = (fallbackVal as Record<string, unknown>)[k];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        val = fallbackVal;
      }

      if (typeof val !== "string") {
        return path;
      }

      // Parameter replacement: {name}, {count}, etc.
      if (params) {
        let result = val;
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
        }
        return result;
      }

      return val;
    };
  }, [language]);

  // Locale-aware currency formatting (EUR)
  const formatPrice = useMemo(() => {
    const locale = language === "it" ? "it-IT" : "en-US";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (cents: number | null): string => {
      if (cents == null) return "—";
      return formatter.format(cents / 100);
    };
  }, [language]);

  // Locale-aware number formatting
  const formatNumber = useMemo(() => {
    const locale = language === "it" ? "it-IT" : "en-US";
    return (value: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(locale, options).format(value);
    };
  }, [language]);

  // Locale-aware date formatting
  const formatDate = useMemo(() => {
    const locale = language === "it" ? "it-IT" : "en-US";
    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    });

    return (date: string | Date | null): string => {
      if (!date) return "—";
      try {
        const d = typeof date === "string" ? new Date(date) : date;
        if (isNaN(d.getTime())) return String(date);
        return formatter.format(d);
      } catch {
        return String(date);
      }
    };
  }, [language]);

  const value: I18nContextType = {
    language,
    setLanguage,
    detectedSystemLanguage: systemInfo.rawCode,
    t,
    formatPrice,
    formatNumber,
    formatDate,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
