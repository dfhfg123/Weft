import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatLongDate,
  translate,
  type Locale,
  type MessageKey,
} from './messages';

import { I18nContext, type I18nValue } from './i18n-context';

const LOCALE_KEY = 'weft.locale';

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {
    // Storage can be unavailable in private browsing.
  }
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((language) => language.toLowerCase().startsWith('zh')) ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // The session still works without persistence.
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const formatDate = useCallback((date?: Date) => formatLongDate(locale, date), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = t('app.title');
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', t('app.description'));
  }, [locale, t]);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t, formatDate }),
    [locale, setLocale, t, formatDate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
