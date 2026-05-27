export interface TranslationDetail {
  text: string;
  phonetic: string;
  notes?: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  formData?: {
    label: string;
    value: string;
  }[];
  documentData?: {
    title?: string;
    sections: {
      heading?: string;
      paragraph: string;
    }[];
  };
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
  docType?: "text" | "document" | "table" | "form";
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  formData?: {
    label: string;
    value: string;
  }[];
  documentData?: {
    title?: string;
    sections: {
      heading?: string;
      paragraph: string;
    }[];
  };
  certification?: {
    certId: string;
    stampText: string;
    date: string;
    signature: string;
    firmName: string;
  };
  category?: "Essential" | "Emergency" | "Business" | "Casual";
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
  isVoiceOnly?: boolean;
  voiceTranscript?: string;
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

export function autoClassifyPhrase(text: string): "Essential" | "Emergency" | "Business" | "Casual" {
  if (!text) return "Casual";
  const lower = text.toLowerCase();
  
  // Emergency indicators (health, security, medical, distress, authority)
  const emergencyKeywords = [
    "help", "hospital", "doctor", "police", "danger", "hurt", "sick", "pain", 
    "accident", "emergency", "fire", "lost", "pharmacy", "medicine", "bleeding", "alert", "security", "fever",
    "ርዳታ", "እባክዎ", "ሀኪም", "ሐኪም", "ሆስፒታል", "ፖሊስ", "አደጋ", "ህመም", "ህመምተኛ", "መድሃኒት"
  ];
  if (emergencyKeywords.some(keyword => lower.includes(keyword))) {
    return "Emergency";
  }

  // Business / Money / Legal / Official indicators
  const businessKeywords = [
    "money", "price", "cost", "pay", "buy", "sell", "business", "meeting", "work", 
    "office", "contract", "company", "currency", "dollar", "euro", "card", "receipt", "bank", "birr", "sworn", "legal", "bureau",
    "ብር", "ገንዘብ", "ስራ", "ዋጋ", "ክፈል", "ፊርማ", "ውል", "ባንክ"
  ];
  if (businessKeywords.some(keyword => lower.includes(keyword))) {
    return "Business";
  }

  // Essential / Survival / Basic Greetings / Common daily requests
  const essentialKeywords = [
    "hello", "hi", "how are you", "thank you", "please", "yesterday", "today", "tomorrow", 
    "where is", "bathroom", "toilet", "water", "food", "eat", "drink", "yes", "no", "goodbye", "excuse me",
    "ሰላም", "እንደምን", "አመሰግናለሁ", "እባክህ", "እባክሽ", "ውሃ", "ምግብ", "መጸዳጃ", "ሽንት ቤት", "የት ነው"
  ];
  if (essentialKeywords.some(keyword => lower.includes(keyword))) {
    return "Essential";
  }

  // default
  return "Casual";
}
