import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Send, 
  History, 
  Trash2, 
  Languages, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Sparkles, 
  BookOpen, 
  Search, 
  Volume2, 
  HelpCircle, 
  ArrowLeftRight,
  Sparkle,
  Bookmark,
  Check,
  AlertCircle,
  Star,
  Play,
  Pause,
  Settings,
  VolumeX,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { OFFLINE_PHRASEBOOK, searchPhrasebook } from "./phrasebook";
import { TranslationResult, HistoryItem, SupportedLanguage, LANGUAGE_LABELS } from "./types";
import LanguageCard from "./components/LanguageCard";
import SyllableVisualizer from "./components/SyllableVisualizer";
import FidelSoundboard from "./components/FidelSoundboard";
import { playRawPcmBase64, playOfflineSpeech, stopAnyActivePlayback } from "./utils/audio";

// Quick tap terms for typing assistance by source language
const QUICK_TEMPLATES_BY_LANG: Record<SupportedLanguage, { text: string; meaning: string }[]> = {
  am: [
    { text: "ሰላም", meaning: "Hello" },
    { text: "አመሰግናለሁ", meaning: "Thank you" },
    { text: "ሆስፒታሉ የት ነው?", meaning: "Where is the hospital?" },
    { text: "ውሃ እፈልጋለሁ", meaning: "I want water" },
    { text: "እንደምን ነህ?", meaning: "How are you?" },
    { text: "አልገባኝም", meaning: "I don't understand" }
  ],
  en: [
    { text: "Hello", meaning: "How are you" },
    { text: "Thank you so much", meaning: "Appreciation" },
    { text: "Where is the hospital?", meaning: "Directions" },
    { text: "I need clean water", meaning: "Thirsty" },
    { text: "How are you today?", meaning: "Greeting" },
    { text: "See you later", meaning: "Goodbye" }
  ],
  om: [
    { text: "Akkam", meaning: "Hello" },
    { text: "Galatoomi", meaning: "Thank you" },
    { text: "Hospitaalli eessa jira?", meaning: "Where is the hospital?" },
    { text: "Bishaanin barbaada", meaning: "I want water" },
    { text: "Akkam jirtu?", meaning: "How are you?" },
    { text: "Naaf hin galledre", meaning: "I don't understand" }
  ],
  ti: [
    { text: "ሰላም", meaning: "Hello" },
    { text: "የቀንየለይ", meaning: "Thank you" },
    { text: "ሆስፒታል ኣበይ ኣሎ?", meaning: "Where is the hospital?" },
    { text: "ማይ እደሊ ኣለኹ", meaning: "I want water" },
    { text: "ከመይ ኣለኻ?", meaning: "How are you?" },
    { text: "ኣይተረድኣንን", meaning: "I don't understand" }
  ],
  so: [
    { text: "Pronto / Nabad", meaning: "Hello" },
    { text: "Waad mahadsantahay", meaning: "Thank you" },
    { text: "Halkee buuxaa isbitaalku?", meaning: "Where is the hospital?" },
    { text: "Waxaan rabbaa biyo", meaning: "I want water" },
    { text: "Aad u fiican tahay?", meaning: "How are you?" },
    { text: "Anigu ma fahmin", meaning: "I don't understand" }
  ],
  zh: [
    { text: "你好", meaning: "Hello (Nǐ hǎo)" },
    { text: "谢谢", meaning: "Thank you (Xièxiè)" },
    { text: "医院在哪里？", meaning: "Where is the hospital? (Yīyuàn zài nǎlǐ?)" },
    { text: "我要水", meaning: "I want water (Wǒ yào shuǐ)" },
    { text: "你好吗？", meaning: "How are you? (Nǐ hǎo ma?)" },
    { text: "我不明白", meaning: "I don't understand (Wǒ bù míngbái)" }
  ],
  fr: [
    { text: "Bonjour", meaning: "Hello" },
    { text: "Merci beaucoup", meaning: "Thank you" },
    { text: "Où est l'hôpital?", meaning: "Where is the hospital?" },
    { text: "Je veux de l'eau", meaning: "I want water" },
    { text: "Comment ça va?", meaning: "How are you?" },
    { text: "Je ne comprends pas", meaning: "I don't understand" }
  ],
  ar: [
    { text: "مرحباً", meaning: "Hello (Marhaban)" },
    { text: "شكراً جزيلاً", meaning: "Thank you (Shukran)" },
    { text: "أين المستشفى؟", meaning: "Where is the hospital? (Ayna al-mustashfa?)" },
    { text: "أريد الماء", meaning: "I want water (Ureedu al-ma'a)" },
    { text: "كيف حالك؟", meaning: "How are you? (Kayfa haluka?)" },
    { text: "لا أفهم", meaning: "I don't understand (La afham)" }
  ],
  es: [
    { text: "Hola", meaning: "Hello" },
    { text: "Muchas gracias", meaning: "Thank you" },
    { text: "¿Dónde está el hospital?", meaning: "Where is the hospital?" },
    { text: "Quiero agua", meaning: "I want water" },
    { text: "¿Cómo estás?", meaning: "How are you?" },
    { text: "No entiendo", meaning: "I don't understand" }
  ]
};

// BCP-47 Speech Recognition Guides
const LANGUAGE_SPEECH_CODES: Record<SupportedLanguage, string> = {
  am: "am-ET",
  en: "en-US",
  om: "om-ET",
  ti: "ti-ET",
  so: "so-SO",
  zh: "zh-CN",
  fr: "fr-FR",
  ar: "ar-SA",
  es: "es-ES"
};

export default function App() {
  // Input & Language States
  const [inputText, setInputText] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [sourceLang, setSourceLang] = useState<SupportedLanguage>("am");
  const [targetLang, setTargetLang] = useState<SupportedLanguage | "all">("all");
  
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [translatedPhrases, setTranslatedPhrases] = useState<TranslationResult[]>([]);
  
  // Status Indicator States
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(30);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  // Offline Phrasebook & History States
  const [phraseSearchQuery, setPhraseSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof OFFLINE_PHRASEBOOK>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // Favorites States & Side Effects
  const [favorites, setFavorites] = useState<TranslationResult[]>(() => {
    const cached = localStorage.getItem("east_african_translate_favorites");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState("");
  const [activeRightTab, setActiveRightTab] = useState<"history" | "favorites">("history");

  useEffect(() => {
    localStorage.setItem("east_african_translate_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (result: TranslationResult) => {
    setFavorites(prev => {
      const alreadyFav = prev.some(fav => fav.originalText === result.originalText);
      if (alreadyFav) {
        return prev.filter(fav => fav.originalText !== result.originalText);
      } else {
        return [result, ...prev];
      }
    });
  };

  const isFavorite = (text: string) => {
    return favorites.some(fav => fav.originalText === text);
  };

  // Sound & Focus States
  const [activePlayingCard, setActivePlayingCard] = useState<string | null>(null);
  const [loadingCardTts, setLoadingCardTts] = useState<string | null>(null);
  const [focusedLang, setFocusedLang] = useState<SupportedLanguage | null>(null);

  // Playlist & Batch Play States
  const [playlistPlaying, setPlaylistPlaying] = useState(false);
  const [activePlaylistPhraseIdx, setActivePlaylistPhraseIdx] = useState<number | null>(null);
  const [playlistActiveLang, setPlaylistActiveLang] = useState<SupportedLanguage | null>(null);
  const [playlistDelayMs, setPlaylistDelayMs] = useState(1500); // 1.5s delay is excellent for language study absorption
  const [playlistLangsToPlay, setPlaylistLangsToPlay] = useState<SupportedLanguage[]>(["en", "zh", "fr", "ar", "es", "am", "om", "ti", "so"]);
  const [playlistSettingsOpenIdx, setPlaylistSettingsOpenIdx] = useState<number | null>(null);
  const playlistCancelRef = useRef<boolean>(false);

  // References for Web Audio Wave Visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Reference for native speech recognition
  const recognitionRef = useRef<any>(null);

  // 1. Monitor network online/offline status automatically
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Seed default translation history if empty so app doesn't look blank on startup
    const cachedHistory = localStorage.getItem("east_african_translate_history");
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch (e) {
        // use default history
        seedDefaultHistory();
      }
    } else {
      seedDefaultHistory();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const seedDefaultHistory = () => {
    const defaultHistory: HistoryItem[] = [
      {
        id: "hist-1",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        amharic: "እንኳን ደህና መጣህ",
        isOffline: true,
        translations: {
          am: { text: "እንኳን ደህና መጣህ", phonetic: "En-kwan de-hna me-tah", notes: "Original Amharic source text." },
          en: { text: "Welcome", phonetic: "Wel-kum", notes: "A friendly greeting for arrivals." },
          om: { text: "Baga nagaan dhuftan", phonetic: "Bah-gah nah-gahn dhoof-tahn", notes: "Polite welcoming phrase in Afaan Oromo." },
          ti: { text: "እንኳዕ ደሓን መጻእኻ", phonetic: "En-kwa-eh deh-hahn meh-tsah-ekh-kha", notes: "Tigrinya translation written in Ge'ez characters." },
          so: { text: "Soo dhowow", phonetic: "Soh dhoh-woh", notes: "Standard greeting in Somali." },
          zh: { text: "欢迎", phonetic: "Huānyíng", notes: "Standard welcoming phrase in Mandarin Chinese." },
          fr: { text: "Bienvenue", phonetic: "Byeh-vuh-noo", notes: "Standard welcoming phrase in French." },
          ar: { text: "مرحباً بك", phonetic: "Marhaban bika", notes: "Arabic welcoming greeting." },
          es: { text: "Bienvenido", phonetic: "Byen-beh-nee-doh", notes: "Spanish welcome greeting." }
        }
      }
    ];
    setHistory(defaultHistory);
    localStorage.setItem("east_african_translate_history", JSON.stringify(defaultHistory));
  };

  // 2. Real-time microphone audio spectrum graphing (Visualizer)
  const startSpectrumVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; // Small fft for tight responsive visualizers
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err) {
      console.warn("Could not acquire microphone for audio visualization stream:", err);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgb(15, 23, 42)"; // Dark navy spectrum background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Scale frequency amplitude into standard canvas height
        const val = dataArray[i];
        const barHeight = (val / 255) * canvas.height * 0.85;

        // Beautiful blue-to-emerald gradient spectrum reflecting sounds
        const red = 10 + (i * 2);
        const green = 180 + (i * 1.2);
        const blue = 150 - (i * 0.5);

        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1.5, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const stopSpectrumVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  // 3. Native webkitSpeechRecognition binding for dynamic Voice capture
  const startVoiceCapture = () => {
    stopAnyActivePlayback();
    setRecognitionError(null);
    setIsRecording(true);
    startSpectrumVisualizer();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionError(`Native ${LANGUAGE_LABELS[sourceLang]?.label || "Amharic"} voice transcription is unsupported in this browser. Showing voice simulation; please type in your query.`);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      const speechLang = LANGUAGE_SPEECH_CODES[sourceLang] || "am-ET";
      rec.lang = speechLang;

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(prev => prev ? prev + " " + transcript : transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        if (e.error === "not-allowed") {
          setRecognitionError("Microphone access declined. Please type your phrase manually.");
        } else {
          setRecognitionError("Speech recognition paused or inactive. Please type Amharic phrase below.");
        }
      };

      rec.onend = () => {
        setIsRecording(false);
        stopSpectrumVisualizer();
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.warn("Failed to boot SpeechRecognition engine:", e);
      setRecognitionError("Browser voice initialization blocked or unsupported.");
    }
  };

  const stopVoiceCapture = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    stopSpectrumVisualizer();
  };

  // Voice capture 30-second limit countdown timer
  useEffect(() => {
    let intervalId: any = null;
    if (isRecording) {
      setRecordingSecondsLeft(30);
      intervalId = setInterval(() => {
        setRecordingSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            stopVoiceCapture();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRecordingSecondsLeft(30);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording]);

  // 4. Translate implementation (Full-stack online via Express API, or offline fuzzy-match library fallback)
  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setLoadingTranslate(true);
    setFocusedLang(null);
    stopAnyActivePlayback();
    setActivePlayingCard(null);

    const phraseList = inputText.split(/[,，\n]+/).map(p => p.trim()).filter(Boolean);

    // A. OFFLINE TRANSLATION HANDLER / GENERAL SPELLBOOK MATCHING
    if (isOffline) {
      setTimeout(() => {
        const results = phraseList.map((phrase): TranslationResult => {
          const cleanQuery = phrase.toLowerCase();
          const matched = OFFLINE_PHRASEBOOK.find(
            item => 
              item.amharic.toLowerCase() === cleanQuery ||
              item.amharicPhonetic.toLowerCase() === cleanQuery ||
              item.en.toLowerCase() === cleanQuery ||
              item.om.toLowerCase() === cleanQuery ||
              item.ti.toLowerCase() === cleanQuery ||
              item.so.toLowerCase() === cleanQuery ||
              item.zh.toLowerCase() === cleanQuery
          );

          if (matched) {
            const translationsData: any = {};
            const availableLangs = Object.keys(LANGUAGE_LABELS) as SupportedLanguage[];
            
            const nativeTexts: Record<string, string> = {
              am: matched.amharic,
              en: matched.en,
              om: matched.om,
              ti: matched.ti,
              so: matched.so,
              zh: matched.zh,
              fr: matched.fr || "",
              ar: matched.ar || "",
              es: matched.es || ""
            };
            const phonetics: Record<string, string> = {
              am: matched.amharicPhonetic,
              en: matched.enPhonetic,
              om: matched.omPhonetic,
              ti: matched.tiPhonetic,
              so: matched.soPhonetic,
              zh: matched.zhPhonetic,
              fr: matched.frPhonetic || "",
              ar: matched.arPhonetic || "",
              es: matched.esPhonetic || ""
            };

            const targetLangsList = targetLang === "all" 
              ? availableLangs.filter(l => l !== sourceLang)
              : [targetLang as SupportedLanguage];

            targetLangsList.forEach(tCode => {
              translationsData[tCode] = {
                text: nativeTexts[tCode] || "[Offline Missing]",
                phonetic: phonetics[tCode] || "...",
                notes: `Matched offline dictionary (${matched.category})`
              };
            });

            return {
              originalText: phrase,
              translations: translationsData,
              grammarBreakdown: [
                { word: phrase, pos: "Common Phrase", meaning: matched.en }
              ],
              syllables: [phrase]
            };
          } else {
            const translationsData: any = {};
            const targetLangsList = targetLang === "all" 
              ? (Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).filter(l => l !== sourceLang)
              : [targetLang as SupportedLanguage];

            targetLangsList.forEach(tCode => {
              translationsData[tCode] = {
                text: `[Offline Translation - No Match for "${phrase}"]`,
                phonetic: "...",
                notes: "Connect to the internet. Gemini custom translations are available online."
              };
            });

            return {
              originalText: phrase,
              translations: translationsData,
              grammarBreakdown: [
                { word: phrase, pos: "Custom query", meaning: "No offline match" }
              ],
              syllables: [phrase]
            };
          }
        });

        setTranslatedPhrases(results);
        if (results.length > 0) {
          setTranslationResult(results[0]);
          appendHistoryItem(results[0], true);
        }
        setLoadingTranslate(false);
      }, 550);

      return;
    }

    // B. ONLINE TRANSLATION HANDLER VIA EXPRESS + GEMINI BACKEND API
    try {
      const targetLangsList = targetLang === "all" 
        ? (Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).filter(l => l !== sourceLang)
        : [targetLang as SupportedLanguage];

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrases: phraseList,
          sourceLang,
          targetLangs: targetLangsList
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Remote server could not translate.");
      }

      const data = await response.json();
      const results: TranslationResult[] = data.results || [];
      
      setTranslatedPhrases(results);
      if (results.length > 0) {
        setTranslationResult(results[0]);
        appendHistoryItem(results[0], false);
      }
    } catch (err: any) {
      console.error("Translation request failed:", err);
      alert(`Could not translate: ${err.message || err}. Reverting you to Local Offline Mode.`);
      setIsOffline(true);
    } finally {
      setLoadingTranslate(false);
    }
  };

  const appendHistoryItem = (result: TranslationResult, offlineFlag: boolean) => {
    const newItem: HistoryItem = {
      id: "hist-" + Date.now(),
      timestamp: new Date().toISOString(),
      amharic: result.originalText,
      translations: result.translations,
      isOffline: offlineFlag
    };

    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 30); // Max 30 cache records
      localStorage.setItem("east_african_translate_history", JSON.stringify(updated));
      return updated;
    });
  };

  // 5. Text-to-Speech vocal output: Web synthesiser for English, Gemini TTS for Regional dialects
  const handleHearVoice = async (langPlayKey: string, text: string, phonetic: string, playbackRate = 1.0, preferredVoiceURI?: string): Promise<void> => {
    stopAnyActivePlayback();
    setActivePlayingCard(null);

    const activeLang = langPlayKey.includes("-") ? langPlayKey.split("-")[1] as SupportedLanguage : langPlayKey as SupportedLanguage;

    return new Promise<void>(async (resolve) => {
      // English, Chinese, French, Arabic, and Spanish have perfect offline/browser voice synthesiser support
      if (activeLang === "en" || activeLang === "zh" || activeLang === "fr" || activeLang === "ar" || activeLang === "es") {
        try {
          setActivePlayingCard(langPlayKey);
          let voiceLang = "en-US";
          if (activeLang === "zh") voiceLang = "zh-CN";
          else if (activeLang === "fr") voiceLang = "fr-FR";
          else if (activeLang === "ar") voiceLang = "ar-SA";
          else if (activeLang === "es") voiceLang = "es-ES";

          playOfflineSpeech(text, voiceLang, () => {
            setActivePlayingCard(prev => prev === langPlayKey ? null : prev);
            resolve();
          }, playbackRate, preferredVoiceURI);
        } catch (e) {
          console.warn(`SpeechSynthesis error on ${activeLang}:`, e);
          setActivePlayingCard(null);
          resolve();
        }
        return;
      }

      // For Oromo, Tigrinya, and Somali: If offline or API fails, speak the phonetic sound guide via browser synthesis
      if (isOffline) {
        try {
          setActivePlayingCard(langPlayKey);
          playOfflineSpeech(phonetic, "en-US", () => {
            setActivePlayingCard(prev => prev === langPlayKey ? null : prev);
            resolve();
          }, playbackRate, preferredVoiceURI);
        } catch (e) {
          console.warn("SpeechSynthesis error on offline phonetic speaker fallback:", e);
          setActivePlayingCard(null);
          resolve();
        }
        return;
      }

      // Online mode: call our backend Express TTS API using gemini-3.1-flash-tts-preview
      try {
        setLoadingCardTts(langPlayKey);
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            language: LANGUAGE_LABELS[activeLang]?.label || activeLang,
            phonetic
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Voice synthesizer failed.");
        }

        const { audioData } = await response.json();
        if (audioData) {
          setActivePlayingCard(langPlayKey);
          await playRawPcmBase64(audioData, 24000, playbackRate);
          setActivePlayingCard(null);
        }
        resolve();
      } catch (err: any) {
        console.error("Online synthesis failed:", err);
        // Fallback: Speak phonetic version using browser Web Speech
        try {
          setActivePlayingCard(langPlayKey);
          playOfflineSpeech(phonetic, "en-US", () => {
            setActivePlayingCard(prev => prev === langPlayKey ? null : prev);
            resolve();
          }, playbackRate, preferredVoiceURI);
        } catch (e) {
          console.warn("SpeechSynthesis error on online-to-offline phonetic speaker fallback:", e);
          setActivePlayingCard(null);
          resolve();
        }
      } finally {
        setLoadingCardTts(null);
      }
    });
  };

  const handleStopVoice = () => {
    playlistCancelRef.current = true;
    setPlaylistPlaying(false);
    setActivePlaylistPhraseIdx(null);
    setPlaylistActiveLang(null);
    stopAnyActivePlayback();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActivePlayingCard(null);
  };

  const handlePlayAllSequential = async (phraseIdx: number, result: TranslationResult) => {
    // If already playing this playlist, clicking again toggles/stops it
    if (playlistPlaying && activePlaylistPhraseIdx === phraseIdx) {
      handleStopVoice();
      return;
    }

    // Prepare active playlist run states
    handleStopVoice(); // Stop any other single playing or active speech
    
    // Brief setTimeout to allow previous cancel states to clear fully
    await new Promise(resolve => setTimeout(resolve, 100));

    setPlaylistPlaying(true);
    setActivePlaylistPhraseIdx(phraseIdx);
    playlistCancelRef.current = false;

    // Filter to languages present in the translation details
    const languagesToSynthesize = (Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).filter(langKey => {
      return result.translations[langKey] && playlistLangsToPlay.includes(langKey);
    });

    for (let i = 0; i < languagesToSynthesize.length; i++) {
      if (playlistCancelRef.current) break;

      const langKey = languagesToSynthesize[i];
      setPlaylistActiveLang(langKey);

      const item = result.translations[langKey];
      if (item) {
        const cardKey = `${phraseIdx}-${langKey}`;
        // Wait organically for this translation text-to-speech to complete speaking!
        await handleHearVoice(cardKey, item.text, item.phonetic);
      }

      // Check for user cancellation state again
      if (playlistCancelRef.current) break;

      // Add educational delay after spelling unless it is the last translation
      if (i < languagesToSynthesize.length - 1) {
        await new Promise(resolve => {
          const timer = setTimeout(resolve, playlistDelayMs);
          // If stopped while in timeout, resolve immediately to break clean
          const checkCancel = setInterval(() => {
            if (playlistCancelRef.current) {
              clearTimeout(timer);
              clearInterval(checkCancel);
              resolve(null);
            }
          }, 50);
        });
      }
    }

    // Clean up run states of the playlist manager
    setPlaylistPlaying(false);
    setActivePlaylistPhraseIdx(null);
    setPlaylistActiveLang(null);
  };

  // Quick helper to search phrasebook locally
  useEffect(() => {
    if (!phraseSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchPhrasebook(phraseSearchQuery);
    setSearchResults(results);
  }, [phraseSearchQuery]);

  const selectPhraseItem = (phrase: typeof OFFLINE_PHRASEBOOK[0]) => {
    setInputText(phrase.amharic);
    const result: TranslationResult = {
      originalText: phrase.amharic,
      translations: {
        am: { text: phrase.amharic, phonetic: phrase.amharicPhonetic, notes: "Original Amharic native source text." },
        en: { text: phrase.en, phonetic: phrase.enPhonetic, notes: `Matched offline dictionary (${phrase.category})` },
        om: { text: phrase.om, phonetic: phrase.omPhonetic, notes: `Matched offline dictionary (${phrase.category})` },
        ti: { text: phrase.ti, phonetic: phrase.tiPhonetic, notes: `Matched offline dictionary (${phrase.category})` },
        so: { text: phrase.so, phonetic: phrase.soPhonetic, notes: `Matched offline dictionary (${phrase.category})` },
        zh: { text: phrase.zh, phonetic: phrase.zhPhonetic, notes: `Matched offline dictionary (${phrase.category})` },
        fr: { text: phrase.fr || "", phonetic: phrase.frPhonetic || "", notes: `Matched offline dictionary (${phrase.category})` },
        ar: { text: phrase.ar || "", phonetic: phrase.arPhonetic || "", notes: `Matched offline dictionary (${phrase.category})` },
        es: { text: phrase.es || "", phonetic: phrase.esPhonetic || "", notes: `Matched offline dictionary (${phrase.category})` }
      },
      grammarBreakdown: [
        { word: phrase.amharic, pos: "Common Expression", meaning: phrase.en }
      ],
      syllables: [phrase.amharic]
    };
    setTranslationResult(result);
    setTranslatedPhrases([result]);
    // Add to history
    appendHistoryItem(result, true);
    setPhraseSearchQuery("");
  };

  const handleSwapLanguages = () => {
    if (targetLang === "all") return;
    const currentSource = sourceLang;
    setSourceLang(targetLang as SupportedLanguage);
    setTargetLang(currentSource);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("east_african_translate_history", JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    if (window.confirm("Are you sure you want to delete all translation history cache?")) {
      setHistory([]);
      localStorage.removeItem("east_african_translate_history");
    }
  };

  const filteredHistory = history.filter(item => 
    item.amharic.includes(historySearchQuery) || 
    item.translations.en.text.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div id="translator-app-root" className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-12 selection:bg-[#1e40af] selection:text-white">
      
      {/* Upper Navigation and Branding Bar */}
      <header id="app-nav-header" className="sticky top-0 z-40 bg-[#1e40af] text-white px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#1e40af] font-black font-sans text-xl">
              H
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5 font-sans">
                HabeshaLingua Pro
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">v2.0</span>
              </h1>
              <p className="text-xs text-blue-100">
                Professional East African Multi-Language Voice &amp; Text Translation Hub
              </p>
            </div>
          </div>

          {/* Online/Offline status toggler with professional color state indicators */}
          <div className="flex items-center gap-2 bg-[#173594] border border-[#2b52cc] p-1 rounded-xl">
            <button
              onClick={() => setIsOffline(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isOffline 
                  ? "bg-white text-[#1e40af] shadow-xs" 
                  : "text-blue-100 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="status-dot w-2 h-2 rounded-full bg-emerald-400"></div>
              <span>Online Mode</span>
            </button>
            <button
              onClick={() => setIsOffline(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isOffline 
                  ? "bg-amber-500 text-white shadow-xs" 
                  : "text-blue-100 hover:text-white hover:bg-white/5"
              }`}
            >
              <WifiOff className="w-3 h-3 text-amber-200" />
              <span>Offline Mode</span>
            </button>
          </div>

        </div>
      </header>

      {/* Primary Container */}
      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input, Recording, Quick Phrases & Instant Search (Col Span 5) */}
        <section className="lg:col-span-5 space-y-6">
          
          <div className="bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col gap-3.5 border-b border-slate-150 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#1e40af] uppercase tracking-wider font-sans">
                  Translation Routing
                </span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                  isOffline ? "bg-amber-100 text-amber-700" : "bg-[#eff6ff] text-[#1e40af]"
                }`}>
                  {isOffline ? "Offline Engine Active" : "Gemini 3.5 Active"}
                </span>
              </div>

              {/* Dynamic Selective Language Router */}
              <div className="grid grid-cols-11 items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                
                {/* Source Selection (Col Span 5) */}
                <div className="col-span-11 sm:col-span-5 relative">
                  <span className="absolute left-2.5 top-1 text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">
                    From
                  </span>
                  <select
                    value={sourceLang}
                    onChange={(e) => {
                      const newSource = e.target.value as SupportedLanguage;
                      setSourceLang(newSource);
                      // If target matches new source, rotate target
                      if (targetLang === newSource) {
                        setTargetLang("all");
                      }
                    }}
                    className="w-full pl-2.5 pr-2 pt-4 pb-1.5 text-xs bg-white rounded-xl border border-slate-200 text-slate-800 font-bold outline-none focus:border-[#1e40af] transition-colors cursor-pointer"
                  >
                    {Object.entries(LANGUAGE_LABELS).map(([code, meta]) => (
                      <option key={code} value={code}>
                        {meta.flag} {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Row (Col Span 1 equivalent or visual center) */}
                <div className="col-span-11 sm:col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-[#1e40af] hover:text-[#1d4ed8] border border-slate-200 hover:scale-105 active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center w-8 h-8"
                    title="Swap languages"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Target Selection (Col Span 5) */}
                <div className="col-span-11 sm:col-span-5 relative">
                  <span className="absolute left-2.5 top-1 text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">
                    To
                  </span>
                  <select
                    value={targetLang}
                    onChange={(e) => {
                      setTargetLang(e.target.value as SupportedLanguage | "all");
                    }}
                    className="w-full pl-2.5 pr-2 pt-4 pb-1.5 text-xs bg-white rounded-xl border border-slate-200 text-slate-800 font-bold outline-none focus:border-[#1e40af] transition-colors cursor-pointer"
                  >
                    <option value="all">🌍 All Languages (Bento Grid)</option>
                    {Object.entries(LANGUAGE_LABELS)
                      .filter(([code]) => code !== sourceLang)
                      .map(([code, meta]) => (
                        <option key={code} value={code}>
                          {meta.flag} {meta.label}
                        </option>
                      ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Main Textarea Form */}
            <form onSubmit={handleTranslate} className="space-y-4">
              <div className="relative">
                <textarea
                  placeholder={
                    sourceLang === "am" 
                      ? "✍️ Type Amharic phrases here... (e.g. ሰላም ጤና ይስጥልኝ)\n💡 Support comma-separated phrases for batch translates! (e.g., ሰላም, አመሰግናለሁ)"
                      : `✍️ Type phrases in ${LANGUAGE_LABELS[sourceLang]?.label} here...\n💡 Support comma-separated batch phrases! (e.g., Hello, Where is the hospital?)`
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-36 p-4 rounded-2xl border border-slate-250 bg-slate-50/50 outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/15 focus:bg-white text-slate-900 placeholder:text-slate-400 font-sans text-base leading-relaxed pr-10 resize-none transition-all"
                />
                
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText("")}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 text-sm font-bold bg-slate-200/50 hover:bg-slate-200 p-1 rounded-full w-5 h-5 flex items-center justify-center transition-all"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Speech recognition errors */}
              {recognitionError && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-805 text-xs flex items-start gap-2 animate-fade-in font-sans">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>{recognitionError}</p>
                </div>
              )}

              {/* Interactive buttons */}
              <div className="flex items-center gap-3">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopVoiceCapture}
                    className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 font-semibold font-sans text-white text-sm px-4 py-3 rounded-2xl flex items-center justify-center gap-2 border border-red-600 shadow-md transition-all animate-pulse"
                  >
                    <MicOff className="w-4 h-4" />
                    <span>Stop Recording ({recordingSecondsLeft}s)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceCapture}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-[#1e40af] hover:border-[#1e40af]/30 font-semibold font-sans text-sm px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Mic className="w-4 h-4 text-[#1e40af] animate-bounce" />
                    <span>Speak {LANGUAGE_LABELS[sourceLang]?.label || "Amharic"}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loadingTranslate || !inputText.trim()}
                  className="p-3 px-6 rounded-2xl font-bold font-sans text-white bg-[#1e40af] hover:bg-[#1d4ed8] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed border border-[#1e40af] select-none flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  {loadingTranslate ? (
                    <div className="w-5 h-5 border-2 border-slate-350 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Translate</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Audio spectrum Canvas visualizer when Voice is active */}
            {isRecording && (
              <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-3 animate-fade-in space-y-2">
                <div className="flex items-center justify-between text-slate-300 text-[10px] font-mono px-1">
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span>VOICE CAPTURE ({LANGUAGE_SPEECH_CODES[sourceLang] || "am-ET"})</span>
                  </span>
                  <span className="text-slate-400">
                    Limit: <strong className="text-rose-400 font-mono text-xs">{recordingSecondsLeft}s</strong> / 30s
                  </span>
                </div>

                {/* Visual Countdown Timer Bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                      recordingSecondsLeft > 15
                        ? "bg-emerald-400"
                        : recordingSecondsLeft > 5
                          ? "bg-amber-400"
                          : "bg-rose-500 animate-pulse"
                    }`}
                    style={{ width: `${(recordingSecondsLeft / 30) * 100}%` }}
                  />
                </div>

                <canvas 
                  ref={canvasRef} 
                  width="360" 
                  height="45" 
                  className="w-full bg-slate-900 rounded-lg shadow-inner"
                />
              </div>
            )}

            {/* Dynamic template assists for typing comfort */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                Click to Quick-Type expressions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(QUICK_TEMPLATES_BY_LANG[sourceLang] || QUICK_TEMPLATES_BY_LANG["am"]).map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(tpl.text);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 hover:bg-[#eff6ff] hover:text-[#1e3a8a] hover:border-[#dbeafe] transition-all font-sans border border-slate-200 text-slate-755 cursor-pointer text-left"
                  >
                    <span className="font-sans font-bold block text-slate-950">{tpl.text}</span>
                    <span className="text-[10px] text-slate-400 block">{tpl.meaning}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Localized Offline Dictionary Fuzzy Search Module */}
          <div className="bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 font-sans">
                  <Search className="w-4 h-4 text-[#1e40af]" />
                  Offline Phrasebook &amp; Fuzzy Search
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal font-sans">
                  Flipped offline? Search keywords (e.g. hospital, hello, water) for instant pre-sound translations.
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="🔍 Type keywords to search dictionary..."
                value={phraseSearchQuery}
                onChange={(e) => setPhraseSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/15 bg-slate-50 placeholder:text-slate-400 font-sans"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 max-h-56 overflow-y-auto animate-fade-in">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                  Phrasebook Matches Found ({searchResults.length})
                </span>
                <div className="space-y-2">
                  {searchResults.map((phrase) => (
                    <button
                      key={phrase.id}
                      onClick={() => selectPhraseItem(phrase)}
                      className="w-full text-left p-2.5 bg-white hover:bg-[#eff6ff] hover:border-[#dbeafe] rounded-xl border border-slate-150 flex items-center justify-between gap-1 transition-all group shadow-2xs cursor-pointer"
                    >
                      <div>
                        <span className="text-[9px] bg-slate-150 border border-slate-250 text-slate-700 px-1.5 py-0.5 rounded-lg font-sans font-semibold uppercase">
                          {phrase.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 font-sans mt-1 group-hover:text-[#1e3a8a]">
                          {phrase.amharic} <span className="text-xs text-slate-500 font-normal">/{phrase.amharicPhonetic}/</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-sans leading-relaxed">
                          en: <strong>{phrase.en}</strong> • om: {phrase.om}
                        </p>
                      </div>
                      <span className="text-xs text-[#1e40af] font-bold opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                        Load →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </section>

        {/* RIGHT COLUMN: Outputs, Syllables Visualizer, Language Cards, & Grammar (Col Span 7) */}
        <section className="lg:col-span-7 space-y-6">

          {/* Active Worksite Title */}
          {translationResult ? (
            <div className="space-y-6">
              
              {/* Reference phrase headers */}
              <div className="bg-[#1e3a8a] border border-[#1e40af]/30 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 text-blue-200">
                    <Sparkle className="w-4 h-4 fill-blue-300" />
                    <span className="text-xs font-semibold uppercase tracking-wider font-sans">Active Analytical Focus</span>
                  </div>
                  
                  <button
                    onClick={() => toggleFavorite(translationResult)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white cursor-pointer z-10"
                    title={isFavorite(translationResult.originalText) ? "Remove from Favorites" : "Save to Favorites"}
                  >
                    <Star
                      className={`w-3.5 h-3.5 transition-transform hover:scale-110 ${
                        isFavorite(translationResult.originalText)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-200"
                      }`}
                    />
                    <span>{isFavorite(translationResult.originalText) ? "Favorited" : "Favorite"}</span>
                  </button>
                </div>

                <h2 className="text-2xl font-black font-sans tracking-tight text-white mb-2">
                  {translationResult.originalText}
                </h2>
                <div className="text-xs text-blue-200 font-medium">
                  Source: <span className="text-white font-bold">{LANGUAGE_LABELS[sourceLang]?.label || sourceLang.toUpperCase()}</span> • Target Mode: <span className="text-white font-bold">{targetLang === "all" ? "All Languages" : LANGUAGE_LABELS[targetLang as SupportedLanguage]?.label}</span>
                </div>
                
                {translationResult.grammarBreakdown && translationResult.grammarBreakdown.length > 0 && (
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <span className="text-[10px] font-bold text-blue-250 tracking-wider block font-sans uppercase mb-2">
                      Morphology &amp; Particle Breakdown
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {translationResult.grammarBreakdown.map((item, i) => (
                        <div key={i} className="bg-white/10 border border-white/5 px-2.5 py-1 rounded-xl text-xs space-y-0.5 font-sans">
                          <span className="font-sans font-bold text-white block">{item.word}</span>
                          <span className="text-[9px] text-[#93c5fd] font-sans italic block lowercase">{item.pos}</span>
                          <span className="text-[10px] text-blue-100 block">{item.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pronunciation Rhythmic Guide */}
              {translationResult.syllables && translationResult.syllables.length > 0 && (
                <SyllableVisualizer 
                  syllables={translationResult.syllables} 
                  originalText={translationResult.originalText} 
                />
              )}

              {/* BATCH PHRASES EXPANSION GRID / LIST OF ALL TRANSLATED ITEMS */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider font-sans block">
                  Translated Phrase Entries ({translatedPhrases.length})
                </h3>
                
                <div id="scrollable-translations-list" className="space-y-6 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
                  {translatedPhrases.map((phraseResult, phraseIdx) => {
                    const isSelected = translationResult.originalText === phraseResult.originalText;
                    return (
                      <div 
                        key={phraseIdx} 
                        className={`group rounded-3xl p-5 border transition-all ${
                          isSelected 
                            ? "bg-white border-[#1e40af]/30 shadow-md ring-2 ring-[#1e40af]/5" 
                            : "bg-white/80 border-slate-200 shadow-xs hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-150/60 pb-3 mb-3 cursor-pointer" onClick={() => setTranslationResult(phraseResult)}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[#eff6ff] text-[#1e40af] border border-[#1e40af]/15 flex items-center justify-center text-xs font-bold font-mono">
                              {phraseIdx + 1}
                            </span>
                            <span className="text-sm font-bold text-slate-800 font-sans group-hover:text-[#1e40af] transition-colors">
                              {phraseResult.originalText}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(phraseResult);
                              }}
                              className="p-1 px-1.5 rounded-lg hover:bg-slate-100 text-left cursor-pointer transition-all flex items-center justify-center"
                              title={isFavorite(phraseResult.originalText) ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <Star
                                className={`w-3.5 h-3.5 transition-all ${
                                  isFavorite(phraseResult.originalText)
                                    ? "fill-amber-500 text-amber-500"
                                    : "text-slate-400 hover:text-amber-500"
                                }`}
                              />
                            </button>

                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
                              isSelected ? "bg-[#eff6ff] text-[#1e40af]" : "bg-slate-100 text-slate-500"
                            }`}>
                              {isSelected ? "Active Focus" : "Click to view analytics"}
                            </span>
                          </div>
                        </div>

                        {/* Playlist Controller Strip */}
                        <div className="flex items-center justify-between gap-3 p-2 px-3 rounded-2xl bg-slate-50 border border-slate-150 mb-3 text-xs font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayAllSequential(phraseIdx, phraseResult);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer border ${
                                playlistPlaying && activePlaylistPhraseIdx === phraseIdx
                                  ? "bg-rose-100 hover:bg-rose-200 border-rose-200 text-rose-700 animate-pulse"
                                  : "bg-[#eff6ff] hover:bg-[#dbeafe] border-[#1e40af]/15 text-[#1e40af]"
                              }`}
                            >
                              {playlistPlaying && activePlaylistPhraseIdx === phraseIdx ? (
                                <>
                                  <VolumeX className="w-3 h-3" />
                                  <span>Stop Sequential Play</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Play All Sequential</span>
                                </>
                              )}
                            </button>

                            {playlistPlaying && activePlaylistPhraseIdx === phraseIdx && playlistActiveLang && (
                              <span className="flex items-center gap-1.5 text-[9.5px] text-slate-500 font-bold bg-white border border-slate-250/50 rounded-lg px-2 py-0.5 shadow-3xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                                Speaking: <span className="text-emerald-600">{LANGUAGE_LABELS[playlistActiveLang]?.flag} {LANGUAGE_LABELS[playlistActiveLang]?.label}</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaylistSettingsOpenIdx(prev => prev === phraseIdx ? null : phraseIdx);
                            }}
                            className={`p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer border border-transparent hover:border-slate-200 transition-all ${
                              playlistSettingsOpenIdx === phraseIdx ? "bg-slate-200 text-slate-800" : ""
                            }`}
                            title="Playlist Settings"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Playlist Collapsible Settings Panel */}
                        {playlistSettingsOpenIdx === phraseIdx && (
                          <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 mb-3 space-y-3 font-sans" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                                Study Mode Silence Delay
                              </span>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {[500, 1000, 1500, 2000, 3000].map((ms) => (
                                  <button
                                    key={ms}
                                    type="button"
                                    onClick={() => setPlaylistDelayMs(ms)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      playlistDelayMs === ms
                                        ? "bg-slate-850 text-white"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    {(ms / 1000).toFixed(1)}s Pause
                                  </button>
                                ))}
                                <span className="text-[10px] text-slate-400 font-medium italic ml-auto">(Interval between spoken results)</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 border-t border-slate-200/50 pt-2.5">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
                                Speech Playlist Queue (Toggle Order &amp; Inclusion)
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((langKey) => {
                                  const isIncluded = playlistLangsToPlay.includes(langKey);
                                  const meta = LANGUAGE_LABELS[langKey];
                                  const hasTranslation = !!phraseResult.translations[langKey];
                                  if (!hasTranslation) return null;

                                  return (
                                    <button
                                      key={langKey}
                                      type="button"
                                      onClick={() => {
                                        setPlaylistLangsToPlay(prev => {
                                          if (prev.includes(langKey)) {
                                            return prev.filter(k => k !== langKey);
                                          } else {
                                            return [...prev, langKey];
                                          }
                                        });
                                      }}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                                        isIncluded
                                          ? "bg-slate-800 border-slate-800 text-white"
                                          : "bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                                      }`}
                                    >
                                      <span>{meta.flag}</span>
                                      <span>{meta.label}</span>
                                      {isIncluded ? (
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* High readability mode header inside card (focusedLang) */}
                        {focusedLang && (
                          <div className="flex items-center justify-between mb-3 bg-[#eff6ff]/70 border border-[#1e40af]/10 rounded-xl px-4 py-2 shadow-2xs">
                            <span className="text-[10px] text-slate-600 font-sans font-semibold">
                              Focused: <span className="text-[#1e40af] font-bold">{LANGUAGE_LABELS[focusedLang]?.label}</span>
                            </span>
                            <button
                              onClick={() => setFocusedLang(null)}
                              className="text-[10px] font-extrabold text-[#1e40af] hover:text-[#1d4ed8] hover:underline cursor-pointer font-sans"
                            >
                              Show All
                            </button>
                          </div>
                        )}

                        {/* Scrollable Horizontal translation list */}
                        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-slate-200">
                          {((Object.keys(LANGUAGE_LABELS) as SupportedLanguage[])
                            .filter(k => k !== sourceLang && (targetLang === "all" || targetLang === k)))
                            .map((langKey) => {
                              if (focusedLang && focusedLang !== langKey) return null;
                              const item = phraseResult.translations[langKey];
                              if (!item) return null;
                              return (
                                <div key={langKey} className={focusedLang ? "w-full min-w-full" : "flex-shrink-0 w-80 snap-start"}>
                                  <LanguageCard
                                    langKey={langKey}
                                    translation={item}
                                    isPlaying={activePlayingCard === `${phraseIdx}-${langKey}`}
                                    loadingTts={loadingCardTts === `${phraseIdx}-${langKey}`}
                                    onPronounce={(speed, voiceURI) => { handleHearVoice(`${phraseIdx}-${langKey}`, item.text, item.phonetic, speed, voiceURI); }}
                                    onStop={handleStopVoice}
                                    isExpanded={focusedLang === langKey}
                                    onToggleExpand={() => setFocusedLang(prev => prev === langKey ? null : langKey)}
                                  />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4 bg-white/55 backdrop-blur-2xs shadow-inner">
              <div className="w-16 h-16 bg-slate-105 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                <Languages className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Awaiting Input Phrases
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
                  Type a sentence or comma-separated phrases in the source language to view multi-directional translations instantly.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto pt-3 border-t border-slate-200 border-dashed">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono w-full block">Quick features:</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600">🇬🇧 English translation</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600">🇪🇹 Oromo dialect</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600">🇪🇷 Tigrinya Ge'ez script</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600">🇸🇴 Somali translation</span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600">🇨🇳 Chinese Mandarin</span>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* LOWER ROW: Fidel Soundboard & History Cache Log Container */}
      <section className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Fidel Key Soundboard (Col Span 7) */}
        <div className="lg:col-span-7">
          <FidelSoundboard />
        </div>

        {/* Saved translation history & favorites logging (Col Span 5) */}
        <div className="lg:col-span-5 bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-sm flex flex-col h-[525px]">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
            <div className="flex gap-2.5">
              <button
                onClick={() => setActiveRightTab("history")}
                className={`flex items-center gap-1.5 pb-2 text-sm font-extrabold font-sans transition-all relative cursor-pointer ${
                  activeRightTab === "history"
                    ? "text-[#1e40af]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <History className="w-4 h-4" />
                <span>History ({history.length})</span>
                {activeRightTab === "history" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e40af] rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveRightTab("favorites")}
                className={`flex items-center gap-1.5 pb-2 text-sm font-extrabold font-sans transition-all relative cursor-pointer ${
                  activeRightTab === "favorites"
                    ? "text-[#1e40af]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Star className={`w-4 h-4 ${favorites.length > 0 ? "text-amber-500 fill-amber-500" : ""}`} />
                <span>Favorites ({favorites.length})</span>
                {activeRightTab === "favorites" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e40af] rounded-full" />
                )}
              </button>
            </div>
            
            {activeRightTab === "history" && history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="text-[10px] font-bold text-red-650 hover:text-red-800 uppercase tracking-wider hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Clear Cache
              </button>
            )}

            {activeRightTab === "favorites" && favorites.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to remove all translations from your favorites?")) {
                    setFavorites([]);
                  }
                }}
                className="text-[10px] font-bold text-red-650 hover:text-red-800 uppercase tracking-wider hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeRightTab === "history" ? "Search history content..." : "Search favorites content..."}
              value={activeRightTab === "history" ? historySearchQuery : favoritesSearchQuery}
              onChange={(e) => {
                if (activeRightTab === "history") {
                  setHistorySearchQuery(e.target.value);
                } else {
                  setFavoritesSearchQuery(e.target.value);
                }
              }}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#1e40af] focus:ring-1 focus:ring-[#1e40af]/20 bg-slate-50 font-sans"
            />
          </div>

          {/* Tab Content Scrolling Pane */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 md:pr-0">
            {activeRightTab === "history" ? (
              filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-sans">
                  No recent translation records matches your search query.
                </div>
              ) : (
                filteredHistory.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const result: TranslationResult = {
                        originalText: item.amharic,
                        translations: item.translations,
                        syllables: [item.amharic]
                      };
                      setTranslationResult(result);
                      setInputText(item.amharic);
                    }}
                    className="p-3.5 bg-slate-50 hover:bg-[#eff6ff]/50 hover:border-[#1e40af]/20 border border-slate-200 rounded-2xl text-left cursor-pointer transition-all relative group shadow-2xs"
                  >
                    <button
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="absolute right-3 top-3.5 p-1 text-[#1e40af] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-baseline gap-1.5 pr-6">
                      <span className="text-[10px] text-slate-400 font-mono font-bold mr-1">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={`text-[9.5px] border px-1.5 py-0.2 rounded font-sans font-bold uppercase ${
                        item.isOffline 
                          ? "bg-amber-50 border-amber-200 text-amber-700" 
                          : "bg-blue-50 border-blue-200 text-[#1e40af]"
                      }`}>
                        {item.isOffline ? "Offline" : "Online"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans font-medium">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 mt-2 font-mono tracking-wide">
                      {item.amharic}
                    </h4>
                    <div className="mt-2 space-y-0.5 text-xs text-slate-600 font-sans border-t border-slate-200/[0.45] pt-2">
                      <p>English: <strong className="text-[#1e3a8a]">{item.translations.en?.text}</strong></p>
                      <p>Afaan Oromo: <span className="text-slate-700">{item.translations.om?.text}</span></p>
                      <p>Tigrinya: <span className="text-slate-700">{item.translations.ti?.text}</span></p>
                      <p>Somali: <span className="text-slate-700">{item.translations.so?.text}</span></p>
                      <p>Chinese (Mandarin): <span className="text-slate-700">{item.translations.zh?.text}</span></p>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Favorites list
              (() => {
                const filteredFavorites = favorites.filter(item => 
                  item.originalText.toLowerCase().includes(favoritesSearchQuery.toLowerCase()) || 
                  Object.values(item.translations).some(t => (t as any)?.text?.toLowerCase().includes(favoritesSearchQuery.toLowerCase()))
                );

                return filteredFavorites.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-sans">
                    {favorites.length === 0 
                      ? "Your favorites list is empty. Click the Star icon on any translation result to save it here!" 
                      : "No matching favorites found for your search query."}
                  </div>
                ) : (
                  filteredFavorites.map((item, index) => (
                    <div
                      key={item.originalText}
                      onClick={() => {
                        setTranslationResult(item);
                        setInputText(item.originalText);
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-[#eff6ff]/50 hover:border-[#1e40af]/20 border border-slate-200 rounded-2xl text-left cursor-pointer transition-all relative group shadow-2xs"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        className="absolute right-3 top-3.5 p-1 text-[#1e40af] hover:text-[#b91c1c] hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from Favorites"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-baseline gap-1.5 pr-6 font-mono text-[10px] text-slate-400">
                        <span className="font-bold mr-1">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] bg-amber-55/70 border border-amber-200 text-amber-700 px-1.5 py-0.2 rounded font-sans font-bold uppercase flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          Saved
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 mt-2 font-mono tracking-wide">
                        {item.originalText}
                      </h4>
                      <div className="mt-2 space-y-0.5 text-xs text-slate-600 font-sans border-t border-slate-200/[0.45] pt-2">
                        {Object.entries(item.translations).map(([langCode, trans]) => {
                          const detail = trans as any;
                          if (!detail?.text) return null;
                          const label = LANGUAGE_LABELS[langCode as SupportedLanguage]?.label || langCode;
                          return (
                            <p key={langCode}>
                              {label}: <strong className="text-indigo-950">{detail.text}</strong>
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  ))
                );
              })()
            )}
          </div>
        </div>

      </section>

      {/* Humble Footer info banner */}
      <footer className="mt-16 text-center border-t border-slate-200/85 pt-6">
        <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed font-sans">
          Amharic East African Voice &amp; Text Translator utilizing Gemini 3.5 LLMs and custom client-side audio players for regional pronunciation tutors. Designed with Professional Polish to preserve low-resource Horn of Africa regional spoken heritage.
        </p>
      </footer>

    </div>
  );
}
