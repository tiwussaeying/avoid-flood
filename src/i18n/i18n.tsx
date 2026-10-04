/**
 * i18n.tsx —— 极简强类型多语言系统（零第三方依赖）
 *
 * 用法：
 *   const { t, lang, setLang } = useTranslation();
 *   <h1>{t.appTagline}</h1>
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Language, TranslationDict } from "./types.js";
import { th } from "./th.js";
import { en } from "./en.js";
import { zh } from "./zh.js";

export const DICTS: Record<Language, TranslationDict> = { th, en, zh };

/** 默认语言：泰语 */
export const DEFAULT_LANG: Language = "th";

const STORAGE_KEY = "floodnav.lang";

/** 读取持久化的语言偏好（容错：localStorage 不可用时回退默认） */
export function readStoredLang(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "th" || saved === "en" || saved === "zh") return saved;
  } catch {
    /* localStorage 不可用（隐私模式/SSR），忽略 */
  }
  return DEFAULT_LANG;
}

export interface I18nValue {
  lang: Language;
  t: TranslationDict;
  setLang: (l: Language) => void;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(
    () => initialLang ?? readStoredLang(),
  );

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* 忽略持久化失败 */
    }
  }, []);

  // 同步 <html lang>
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, t: DICTS[lang], setLang }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** 消费 i18n 上下文 */
export function useTranslation(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation 必须在 <I18nProvider> 内使用");
  return ctx;
}
