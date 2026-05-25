export interface TranslationDetail {
  text: string;
  phonetic: string;
  notes?: string;
}

export type SupportedLanguage = "am" | "en" | "om" | "ti" | "so" | "zh" | "fr" | "ar" | "es";

export type LanguageTranslations = Record<SupportedLanguage, TranslationDetail>;

export interface WordBreakdown {
  word: string;
  pos: string; // Part of speech
  meaning: string;
}

export interface TranslationResult {
  originalText: string;
  translations: LanguageTranslations;
  grammarBreakdown?: WordBreakdown[];
  syllables?: string[];
}

export interface PhrasebookItem {
  id: string;
  category: string;
  amharic: string;
  amharicPhonetic: string;
  en: string;
  enPhonetic: string;
  om: string;
  omPhonetic: string;
  ti: string;
  tiPhonetic: string;
  so: string;
  soPhonetic: string;
  zh: string;
  zhPhonetic: string;
  fr?: string;
  frPhonetic?: string;
  ar?: string;
  arPhonetic?: string;
  es?: string;
  esPhonetic?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string; // ISO String
  amharic: string;
  translations: LanguageTranslations;
  isOffline: boolean;
  notes?: string;
}

export const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; details: string; flag: string }> = {
  am: { label: "Amharic", details: "Ethic language of Ethiopia, Ge'ez script", flag: "🇪🇹" },
  en: { label: "English", details: "Global lingua franca, Latin script", flag: "🇬🇧" },
  om: { label: "Afaan Oromo", details: "Largest language of Ethiopia, Latin script", flag: "🇪🇹" },
  ti: { label: "Tigrinya", details: "Northern Ethiopia & Eritrea, Ge'ez script", flag: "🇪🇷" },
  so: { label: "Somali", details: "Somalia, Djibouti & East Africa, Latin script", flag: "🇸🇴" },
  zh: { label: "Chinese (Mandarin)", details: "Standard Simplified Chinese, Hanzi & Pinyin", flag: "🇨🇳" },
  fr: { label: "French", details: "Official language of France & 29 nations, Latin script", flag: "🇫🇷" },
  ar: { label: "Arabic", details: "Middle East & North Africa, Arabic script from right-to-left", flag: "🇸🇦" },
  es: { label: "Spanish", details: "Second-most spoken native language worldwide, Latin script", flag: "🇪🇸" }
};
