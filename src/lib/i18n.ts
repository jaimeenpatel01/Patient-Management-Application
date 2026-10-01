import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';

export const LANGUAGE_STORAGE_KEY = 'app_language';

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
} as const;

export type SupportedLanguage = keyof typeof resources;

const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === 'en' || value === 'hi';
}

/**
 * Resolves the initial language before i18next finishes initializing:
 * 1. Previously persisted user choice (AsyncStorage)
 * 2. Device locale (via expo-localization, if installed)
 * 3. Fallback to English
 *
 * Note: expo-localization is not currently a project dependency, so this
 * always falls back to 'en' unless a stored preference exists.
 */
async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read errors — fall back below.
  }

  return FALLBACK_LANGUAGE;
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (!initPromise) {
    initPromise = resolveInitialLanguage().then((lng) =>
      i18n
        .use(initReactI18next)
        .init({
          resources,
          lng,
          fallbackLng: FALLBACK_LANGUAGE,
          interpolation: {
            escapeValue: false,
          },
        })
        .then(() => undefined)
    );
  }
  return initPromise;
}

/** Persists the user's language choice and switches i18next to it. */
export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Non-fatal — the in-memory language change still applies this session.
  }
}

// Kick off initialization as a side effect of importing this module.
initI18n();

export default i18n;
