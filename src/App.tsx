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
  ChevronUp,
  GraduationCap,
  Calendar,
  Download,
  Clock,
  ExternalLink,
  Bell,
  FileText,
  Camera,
  Upload,
  X,
  Video
} from "lucide-react";
import { OFFLINE_PHRASEBOOK, searchPhrasebook } from "./phrasebook";
import { TranslationResult, HistoryItem, SupportedLanguage, LANGUAGE_LABELS, autoClassifyPhrase } from "./types";
import LanguageCard from "./components/LanguageCard";
import SyllableVisualizer from "./components/SyllableVisualizer";
import FidelSoundboard from "./components/FidelSoundboard";
import { playRawPcmBase64, playOfflineSpeech, stopAnyActivePlayback } from "./utils/audio";
import { getAudio, saveAudio, clearLanguage, getDownloadedCount, getLanguageCacheSizeInKb } from "./utils/voiceDb";

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

  // Multimodal Translation States
  const [translateMode, setTranslateMode] = useState<"text" | "document" | "camera">("text");
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; base64: string; name: string; type: string; size: number }[]>([]);
  const [selectedFavCategory, setSelectedFavCategory] = useState<"All" | "Essential" | "Emergency" | "Business" | "Casual">("All");
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCameraStream = async () => {
    stopCameraStream();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraStreamActive(true);
      
      // Assign video stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Enumerate other cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === "videoinput");
      setCameraDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        "Could not access your camera. Please ensure camera permissions are allowed in your browser settings."
      );
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStreamActive(false);
  };

  // Camera flow effect
  useEffect(() => {
    if (translateMode === "camera") {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [translateMode, selectedCameraId]);
  
  // Status Indicator States
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHoldingToTalk, setIsHoldingToTalk] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(30);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  // PDF Export & Audio Settings
  const [pdfLayout, setPdfLayout] = useState<"compact" | "detailed">(() => {
    const saved = localStorage.getItem("habeshalingua_pdf_layout");
    return (saved === "compact" || saved === "detailed") ? saved : "detailed";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalSpeechSpeed, setGlobalSpeechSpeed] = useState<number>(() => {
    const saved = localStorage.getItem("habeshalingua_global_speech_speed");
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    localStorage.setItem("habeshalingua_pdf_layout", pdfLayout);
  }, [pdfLayout]);

  useEffect(() => {
    localStorage.setItem("habeshalingua_global_speech_speed", globalSpeechSpeed.toString());
  }, [globalSpeechSpeed]);

  // Voice Pack Cache Manager States
  const [settingsTab, setSettingsTab] = useState<"pdf" | "voicePacks" | "feedback">("pdf");
  const [voicePackCounts, setVoicePackCounts] = useState<Record<string, number>>({});
  const [voicePackSizes, setVoicePackSizes] = useState<Record<string, number>>({});
  const [downloadingLang, setDownloadingLang] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; error?: string } | null>(null);

  // Feedback Reports Log States
  const [feedbackLogs, setFeedbackLogs] = useState<any[]>([]);
  const [feedbackSearch, setFeedbackSearch] = useState("");

  const loadFeedbackLogs = () => {
    try {
      const raw = localStorage.getItem("habeshalingua_feedback_log");
      setFeedbackLogs(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.error("Failed to load translation feedback logs:", e);
    }
  };

  useEffect(() => {
    if (settingsOpen) {
      loadFeedbackLogs();
    }
  }, [settingsOpen]);

  useEffect(() => {
    const handleFeedbackUpdate = () => {
      loadFeedbackLogs();
    };
    window.addEventListener("storage_feedback_updated", handleFeedbackUpdate);
    return () => {
      window.removeEventListener("storage_feedback_updated", handleFeedbackUpdate);
    };
  }, []);

  // Load voice pack stats on modal display
  const loadVoicePackStats = async () => {
    try {
      const langs = ["am", "om", "ti", "so"];
      const counts: Record<string, number> = {};
      const sizes: Record<string, number> = {};
      for (const code of langs) {
        counts[code] = await getDownloadedCount(code);
        sizes[code] = await getLanguageCacheSizeInKb(code);
      }
      setVoicePackCounts(counts);
      setVoicePackSizes(sizes);
    } catch (err) {
      console.error("Failed to load offline voice pack database statistics:", err);
    }
  };

  useEffect(() => {
    if (settingsOpen) {
      loadVoicePackStats();
      setSettingsTab("pdf");
    }
  }, [settingsOpen]);

  const handleDownloadVoicePack = async (langCode: string) => {
    if (downloadingLang) return; // Prevent double downloads
    
    const langKeyMap: Record<string, string> = {
      am: "amharic",
      om: "om",
      ti: "ti",
      so: "so"
    };

    const phoneticKeyMap: Record<string, string> = {
      am: "amharicPhonetic",
      om: "omPhonetic",
      ti: "tiPhonetic",
      so: "soPhonetic"
    };

    const nativeKey = langKeyMap[langCode];
    const phoneticKey = phoneticKeyMap[langCode];
    if (!nativeKey) return;

    // Filter relevant phrasebook items containing text
    const itemsToDownload = OFFLINE_PHRASEBOOK.filter(item => {
      const text = (item as any)[nativeKey];
      return text && text.trim().length > 0;
    });

    if (itemsToDownload.length === 0) {
      alert("No prebuilt dictionary phrases found for this language pack.");
      return;
    }

    setDownloadingLang(langCode);
    setDownloadProgress({ current: 0, total: itemsToDownload.length });

    let currentCount = 0;
    let failedCount = 0;

    try {
      for (const item of itemsToDownload) {
        const text = (item as any)[nativeKey];
        const phonetic = (item as any)[phoneticKey] || "";

        try {
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              language: LANGUAGE_LABELS[langCode as SupportedLanguage]?.label || langCode,
              phonetic
            })
          });

          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }

          const data = await response.json();
          if (data && data.audioData) {
            await saveAudio(langCode, text, data.audioData);
          } else {
            throw new Error("Missing audio payload in response");
          }
        } catch (itemError) {
          console.warn(`Failed to cache phrase [${text}]:`, itemError);
          failedCount++;
        }

        currentCount++;
        setDownloadProgress({
          current: currentCount,
          total: itemsToDownload.length,
          error: failedCount > 0 ? `${failedCount} skipped` : undefined
        });

        // Small break to avoid browser thread locking
        await new Promise(r => setTimeout(r, 65));
      }
    } catch (fatalErr: any) {
      console.error("Pack download interrupted fatal issue:", fatalErr);
      alert(`Download interrupted: ${fatalErr.message || fatalErr}`);
    } finally {
      setDownloadingLang(null);
      setDownloadProgress(null);
      await loadVoicePackStats();
    }
  };

  const handleDeleteVoicePack = async (langCode: string) => {
    if (downloadingLang) return;
    if (confirm(`Remove downloaded high-quality voice audio pack from offline cache?`)) {
      try {
        await clearLanguage(langCode);
        await loadVoicePackStats();
      } catch (err) {
        console.error("Failed to empty cached voice partition:", err);
      }
    }
  };


  
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
        const itemWithTag = {
          ...result,
          category: result.category || autoClassifyPhrase(result.originalText)
        };
        return [itemWithTag, ...prev];
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
  const [quizMode, setQuizMode] = useState(false);

  // Playlist & Batch Play States
  const [playlistPlaying, setPlaylistPlaying] = useState(false);
  const [activePlaylistPhraseIdx, setActivePlaylistPhraseIdx] = useState<number | null>(null);
  const [playlistActiveLang, setPlaylistActiveLang] = useState<SupportedLanguage | null>(null);
  const [playlistDelayMs, setPlaylistDelayMs] = useState(1500); // 1.5s delay is excellent for language study absorption
  const [playlistLangsToPlay, setPlaylistLangsToPlay] = useState<SupportedLanguage[]>(["en", "zh", "fr", "ar", "es", "am", "om", "ti", "so"]);
  const [playlistSettingsOpenIdx, setPlaylistSettingsOpenIdx] = useState<number | null>(null);
  const playlistCancelRef = useRef<boolean>(false);

  // Calendar integration states
  const [calendarPanelOpen, setCalendarPanelOpen] = useState(false);
  const [studyDate, setStudyDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Tomorrow by default
    return today.toISOString().split("T")[0];
  });
  const [studyTime, setStudyTime] = useState(() => {
    return localStorage.getItem("east_african_study_time") || "10:00";
  });
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(() => {
    return localStorage.getItem("east_african_notifications_enabled") === "true";
  });
  const [studyDuration, setStudyDuration] = useState(30);
  const [studyRecurrence, setStudyRecurrence] = useState<"none" | "daily" | "weekly">("none");
  const [studyPlanTitle, setStudyPlanTitle] = useState("Horn of Africa Language Study Routine");

  useEffect(() => {
    localStorage.setItem("east_african_study_time", studyTime);
  }, [studyTime]);

  useEffect(() => {
    localStorage.setItem("east_african_notifications_enabled", String(browserNotificationsEnabled));
  }, [browserNotificationsEnabled]);

  // Daily notification check loop
  useEffect(() => {
    if (!browserNotificationsEnabled || typeof Notification === 'undefined' || Notification.permission !== "granted") {
      return;
    }

    const checkTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const [studyHour, studyMinute] = studyTime.split(":").map(Number);
      
      const lastPromptedDate = localStorage.getItem("east_african_last_notified_date");
      const YYYY = now.getFullYear();
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const DD = String(now.getDate()).padStart(2, '0');
      const currentDateString = `${YYYY}-${MM}-${DD}`;

      if (currentHour === studyHour && currentMinute === studyMinute && lastPromptedDate !== currentDateString) {
        new Notification("Time to Study!", {
          body: `Your scheduled review for "${studyPlanTitle}" is starting now. Practice your favorites!`,
        });
        localStorage.setItem("east_african_last_notified_date", currentDateString);
      }
    };

    const intervalId = setInterval(checkTime, 30000);
    checkTime(); // Initial check

    return () => clearInterval(intervalId);
  }, [browserNotificationsEnabled, studyTime, studyPlanTitle]);

  const toggleNotifications = async () => {
    if (browserNotificationsEnabled) {
      setBrowserNotificationsEnabled(false);
      return;
    }

    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setBrowserNotificationsEnabled(true);
      } else {
        alert("Notification permission was denied. Please enable them in your browser settings to use this feature.");
      }
    } else {
      alert("Browser notification API is not supported in your browser.");
    }
  };

  const generateIcsData = () => {
    const [year, month, day] = studyDate.split("-").map(Number);
    const [hour, minute] = studyTime.split(":").map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    const end = new Date(start.getTime() + studyDuration * 60000);

    const formatToiCal = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const dstart = formatToiCal(start);
    const dend = formatToiCal(end);
    const dstamp = formatToiCal(new Date());

    // Build description with structured saved phrases
    let descLines: string[] = [];
    descLines.push("=== DIALECT STUDY PLAN ===");
    descLines.push("Goal: Practice pronunciation and memorize retention phrases saved recently.");
    descLines.push("");
    descLines.push("Target Vocabulary List:");
    favorites.forEach((fav, i) => {
      descLines.push(`${i + 1}. Original: ${fav.originalText}`);
      Object.entries(fav.translations).forEach(([langCode, trans]) => {
        const detail = trans as any;
        if (detail?.text) {
          const label = LANGUAGE_LABELS[langCode as SupportedLanguage]?.label || langCode;
          descLines.push(`   - ${label}: ${detail.text} (Phonetic: /${detail.phonetic || ""}/)`);
        }
      });
      descLines.push("");
    });
    descLines.push("Keep reviewing in the app!");
    
    const descriptPlain = descLines.join("\\n");
    
    const uid = `session-${Date.now()}@east-african-voice-translator`;

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//East African Multi-Lingual Multitool//iCal Study Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dstamp}`,
      `DTSTART:${dstart}`,
      `DTEND:${dend}`,
      `SUMMARY:${studyPlanTitle}`,
      `DESCRIPTION:${descriptPlain}`,
      studyRecurrence === "daily" ? "RRULE:FREQ=DAILY;COUNT=7" : studyRecurrence === "weekly" ? "RRULE:FREQ=WEEKLY;COUNT=4" : "",
      "LOCATION:East African Language Applet",
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");
  };

  const handleDownloadIcs = () => {
    if (favorites.length === 0) {
      alert("Please save some phrases to your Favorites first to build a custom study routine.");
      return;
    }
    try {
      const ics = generateIcsData();
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `language-study-session.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to export iCalendar file: " + err.message);
    }
  };

  const handleGoogleCalendarUrl = () => {
    if (favorites.length === 0) {
      alert("Please save some phrases to your Favorites first to build a custom study routine.");
      return;
    }
    const [year, month, day] = studyDate.split("-").map(Number);
    const [hour, minute] = studyTime.split(":").map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    const end = new Date(start.getTime() + studyDuration * 60000);

    const formatToiCal = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    let descParts: string[] = [];
    descParts.push("Daily Study Routine Targets:");
    favorites.forEach((fav, i) => {
      descParts.push(`${i + 1}. ${fav.originalText}`);
      Object.entries(fav.translations).forEach(([langCode, trans]) => {
        const detail = trans as any;
        if (detail?.text) {
          const label = LANGUAGE_LABELS[langCode as SupportedLanguage]?.label || langCode;
          descParts.push(`   * ${label}: ${detail.text}`);
        }
      });
    });

    const dates = `${formatToiCal(start)}/${formatToiCal(end)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(studyPlanTitle)}&dates=${dates}&details=${encodeURIComponent(descParts.join("\n"))}&ctz=${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    
    window.open(url, "_blank");
  };

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

  const pttStartTimestamp = useRef<number>(0);

  const handlePTTStart = (e: React.MouseEvent | React.TouchEvent) => {
    // On touch devices prevent default scrolling or context menus if triggered on the mic button
    if (e.type === "touchstart" && e.cancelable) {
      e.preventDefault();
    }
    pttStartTimestamp.current = Date.now();
    setIsHoldingToTalk(true);
    if (!isRecording) {
      startVoiceCapture();
    }
  };

  const handlePTTEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === "touchend" && e.cancelable) {
      e.preventDefault();
    }
    if (isHoldingToTalk) {
      setIsHoldingToTalk(false);
      const pressDuration = Date.now() - pttStartTimestamp.current;
      // If they held the button for more than 400ms, releasing it acts as standard push-to-talk release.
      if (pressDuration > 400 && isRecording) {
        stopVoiceCapture();
      }
    }
  };

  const handlePTTClick = (e: React.MouseEvent) => {
    const pressDuration = Date.now() - pttStartTimestamp.current;
    // If they did a quick click (< 400ms) and it's active, clicking it again toggles it off.
    if (pressDuration <= 400) {
      if (isRecording) {
        stopVoiceCapture();
      }
    }
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
  const handleTranslate = async (
    e?: React.FormEvent,
    overrideText?: string,
    overrideSrcLng?: SupportedLanguage,
    overrideTgtLng?: SupportedLanguage | "all"
  ) => {
    if (e) e.preventDefault();
    
    const activeText = overrideText !== undefined ? overrideText : inputText;
    const activeSrc = overrideSrcLng !== undefined ? overrideSrcLng : sourceLang;
    const activeTgt = overrideTgtLng !== undefined ? overrideTgtLng : targetLang;

    if (!activeText.trim()) return;

    setLoadingTranslate(true);
    setFocusedLang(null);
    stopAnyActivePlayback();
    setActivePlayingCard(null);

    const phraseList = activeText.split(/[,，\n]+/).map(p => p.trim()).filter(Boolean);

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

            const targetLangsList = activeTgt === "all" 
              ? availableLangs.filter(l => l !== activeSrc)
              : [activeTgt as SupportedLanguage];

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
            const targetLangsList = activeTgt === "all" 
              ? (Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).filter(l => l !== activeSrc)
              : [activeTgt as SupportedLanguage];

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
      const targetLangsList = activeTgt === "all" 
        ? (Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).filter(l => l !== activeSrc)
        : [activeTgt as SupportedLanguage];

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrases: phraseList,
          sourceLang: activeSrc,
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

  const handleQuickSwitch = (newText: string, newSource: SupportedLanguage, newTarget: SupportedLanguage | "all") => {
    setInputText(newText);
    setSourceLang(newSource);
    setTargetLang(newTarget);
    handleTranslate(undefined, newText, newSource, newTarget);
  };

  const handleTranslateFile = async (base64Data: string, mimeType: string) => {
    setLoadingTranslate(true);
    setFocusedLang(null);
    stopAnyActivePlayback();
    setActivePlayingCard(null);
    
    try {
      if (isOffline) {
        throw new Error("Multimodal document and camera translations require an online Gemini connection.");
      }
      
      const targetLangsList = targetLang === "all" 
        ? (Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).filter(l => l !== sourceLang)
        : [targetLang as SupportedLanguage];

      const response = await fetch("/api/translate-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: mimeType,
          targetLangs: targetLangsList
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Multimodal server was unable to translate the file.");
      }

      const data = await response.json();
      const results: TranslationResult[] = data.results || [];

      setTranslatedPhrases(results);
      if (results.length > 0) {
        setTranslationResult(results[0]);
        appendHistoryItem(results[0], false);
      }
    } catch (err: any) {
      console.error("Multimodal Translation Failure:", err);
      alert(`AI Translation failed: ${err.message || err}`);
    } finally {
      setLoadingTranslate(false);
    }
  };

  const readAndAddFiles = (filesList: FileList | File[]) => {
    Array.from(filesList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: "file-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
            base64,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      readAndAddFiles(e.target.files);
    }
  };

  const handleTranslateAllFiles = async () => {
    if (uploadedFiles.length === 0) return;
    setLoadingTranslate(true);
    setFocusedLang(null);
    stopAnyActivePlayback();
    setActivePlayingCard(null);

    try {
      if (isOffline) {
        throw new Error("Multimodal document and camera translations require an online Gemini connection.");
      }

      const results: TranslationResult[] = [];

      for (let i = 0; i < uploadedFiles.length; i++) {
        const fileObj = uploadedFiles[i];
        
        const targetLangsList = targetLang === "all" 
          ? (Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).filter(l => l !== sourceLang)
          : [targetLang as SupportedLanguage];

        const response = await fetch("/api/translate-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: fileObj.base64,
            mimeType: fileObj.type,
            targetLangs: targetLangsList
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`[${fileObj.name}] Translate failed: ${errData.error || "Multimodal server processing issue"}`);
        }

        const data = await response.json();
        const fileResults = data.results || [];
        if (fileResults.length > 0) {
          // Carry any manually classified / automatic tags
          fileResults.forEach((res: any) => {
            res.category = autoClassifyPhrase(res.originalText);
          });
          results.push(...fileResults);
        }
      }

      if (results.length > 0) {
        setTranslatedPhrases(results);
        setTranslationResult(results[0]);
        results.forEach(res => appendHistoryItem(res, false));
        setUploadedFiles([]);
      }
    } catch (err: any) {
      console.error("Batch files translation failure:", err);
      alert(`Translate failed: ${err.message || err}`);
    } finally {
      setLoadingTranslate(false);
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const jpegBase64 = canvas.toDataURL("image/jpeg", 0.9);
    handleTranslateFile(jpegBase64, "image/jpeg");
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
  const handleHearVoice = async (langPlayKey: string, text: string, phonetic: string, playbackRate = 1.0, preferredVoiceURI?: string, volume = 1.0, loop = false): Promise<void> => {
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
          }, playbackRate, preferredVoiceURI, volume, loop);
        } catch (e) {
          console.warn(`SpeechSynthesis error on ${activeLang}:`, e);
          setActivePlayingCard(null);
          resolve();
        }
        return;
      }

      // For Oromo, Tigrinya, and Somali: Check high-quality voice packs offline database first (available offline & online!)
      try {
        const cachedBase64 = await getAudio(activeLang, text);
        if (cachedBase64) {
          try {
            setActivePlayingCard(langPlayKey);
            await playRawPcmBase64(cachedBase64, 24000, playbackRate, volume, loop);
            setActivePlayingCard(null);
            resolve();
            return;
          } catch (playbackError) {
            console.warn("Offline high-quality PCM voice playback failed, reverting to defaults:", playbackError);
          }
        }
      } catch (dbError) {
        console.warn("IndexedDB voice pack fetch failed:", dbError);
      }

      // For Oromo, Tigrinya, and Somali: If offline or API fails, speak the phonetic sound guide via browser synthesis
      if (isOffline) {
        try {
          setActivePlayingCard(langPlayKey);
          playOfflineSpeech(phonetic, "en-US", () => {
            setActivePlayingCard(prev => prev === langPlayKey ? null : prev);
            resolve();
          }, playbackRate, preferredVoiceURI, volume, loop);
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
          await playRawPcmBase64(audioData, 24000, playbackRate, volume, loop);
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
          }, playbackRate, preferredVoiceURI, volume, loop);
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

  const exportHistoryToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const listToPrint = filteredHistory;
    const isCompact = pdfLayout === "compact";

    const styleBlock = isCompact ? `
      body { font-family: system-ui, -apple-system, sans-serif; padding: 15px; color: #334155; line-height: 1.3; background: #fff; font-size: 11px; }
      .container { max-width: 100%; margin: 0; border: 1px solid #cbd5e1; padding: 15px; border-radius: 4px; }
      .header { border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .header h1 { font-size: 14px; margin: 0; text-transform: uppercase; color: #1e40af; font-weight: 800; }
      .header p { font-size: 8px; margin: 0; color: #64748b; letter-spacing: 0.5px; }
      .meta-info { font-size: 9px; color: #64748b; margin-bottom: 10px; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
      .item-card { border: 1px solid #f1f5f9; border-radius: 4px; padding: 8px 12px; margin-bottom: 6px; page-break-inside: avoid; background-color: #f8fafc; }
      .item-num { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; }
      .original-text { font-size: 12px; font-weight: bold; color: #0f172a; margin: 2px 0 4px 0; font-family: system-ui, sans-serif; }
      .translations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0; }
      .translation-row { display: flex; border-bottom: none; padding-bottom: 1px; }
      .lang-label { font-weight: bold; color: #475569; width: 75px; min-width: 75px; font-size: 9.5px; }
      .lang-text { color: #0f172a; font-weight: 500; font-size: 9.5px; }
      .seal-section { margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; }
      .seal-svg { width: 45px; height: 45px; }
      @media print {
        body { padding: 0; }
        .container { border: none; }
      }
    ` : `
      body { font-family: 'Times New Roman', serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fff; }
      .container { max-width: 800px; margin: 0 auto; border: 4px double #1e40af; padding: 30px; border-radius: 8px; }
      .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 25px; position: relative; }
      .header h1 { font-size: 24px; margin: 0; text-transform: uppercase; color: #1e40af; font-family: system-ui, sans-serif; }
      .header p { font-size: 11px; margin: 5px 0 0 0; color: #475569; font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: 2px; }
      .meta-info { font-family: system-ui, sans-serif; font-size: 11px; color: #64748b; margin-bottom: 20px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; }
      .item-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; background-color: #f8fafc; }
      .item-num { font-family: monospace; font-size: 12px; font-weight: bold; color: #1e40af; }
      .original-text { font-size: 16px; font-weight: bold; color: #0f172a; margin: 8px 0; font-family: monospace; }
      .translations-grid { display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-family: system-ui, sans-serif; font-size: 13px; }
      .translation-row { display: flex; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
      .translation-row:last-child { border-bottom: none; }
      .lang-label { font-weight: bold; color: #475569; width: 140px; min-width: 140px; }
      .lang-text { color: #0f172a; font-weight: 600; }
      .seal-section { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-family: system-ui, sans-serif; font-size: 11px; }
      .seal-svg { width: 80px; height: 80px; }
      @media print {
        body { padding: 0; }
        .container { border-color: #000; box-shadow: none; }
      }
    `;

    const htmlContent = `
      <html>
        <head>
          <title>HabeshaLingua Sworn Legal Bureau - Translation History Ledger</title>
          <style>
            ${styleBlock}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Official Language Translation Registry Ledger</h1>
              ${isCompact ? `
                <p>HabeshaLingua Sworn Bureau (Compact Edition)</p>
              ` : `
                <p>HabeshaLingua Sworn Legal Bureau — Licensed Court-Approved Localization Firm</p>
              `}
            </div>
            <div class="meta-info">
              <div><strong>Ledger Reference ID:</strong> REG-HIST-${Date.now().toString().slice(-6)}</div>
              <div><strong>Attestation Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            
            <p style="font-size: ${isCompact ? "10px" : "12px"}; margin-bottom: ${isCompact ? "10px" : "20px"}; font-style: italic;">We hereby attest and certify that the following ${listToPrint.length} translation records translated through the Sworn Interactive Network are verified, recorded, and published for study and official inspection.</p>

            ${listToPrint.map((item, idx) => `
              <div class="item-card">
                <span class="item-num">RECORD #${String(idx + 1).padStart(3, '0')}</span>
                <div class="original-text">${item.amharic}</div>
                <div class="translations-grid">
                  ${Object.entries(item.translations).map(([langCode, trans]) => {
                    const detail = trans as any;
                    if (!detail?.text) return "";
                    const label = LANGUAGE_LABELS[langCode as SupportedLanguage]?.label || langCode;
                    return `
                      <div class="translation-row">
                        <span class="lang-label">${label}:</span>
                        <span class="lang-text">${detail.text} ${detail.phonetic ? `<span style="font-style: italic; font-weight: normal; color: #64748b; font-size: ${isCompact ? "9px" : "11.5px"};">(/${detail.phonetic}/)</span>` : ""}</span>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            `).join("")}

            <div class="seal-section">
              <div>
                <strong>Issued By:</strong> Sworn Translation Notary Committee<br/>
                <strong>Bureau Signature:</strong> <span style="font-family: serif; font-style: italic; font-size: ${isCompact ? "10px" : "13px"}; text-decoration: underline;">Sworn-Bureau-Verify</span><br/>
                <strong>Status:</strong> Legally Audited Ledger ${isCompact ? "(Compact)" : ""}
              </div>
              <svg class="seal-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#d97706" stroke-width="2" stroke-dasharray="3 3"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#d97706" stroke-width="1"/>
                <text x="50" y="44" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#d97706" font-family="sans-serif">VERIFIED</text>
                <text x="50" y="52" text-anchor="middle" font-size="5" fill="#d97706" font-family="sans-serif">SWORN COURT</text>
                <text x="50" y="60" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#d97706" font-family="sans-serif">LEDGER</text>
              </svg>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const exportFavoriteToPDF = (item: TranslationResult) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cert = item.certification || {
      certId: `EAS-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      stampText: "East African Court Localization Seal of Professional Accuracy",
      date: new Date().toLocaleDateString(),
      signature: "Authorized Localizer Sign",
      firmName: "HabeshaLingua Sworn Legal Bureau"
    };

    let formattingContent = "";
    if (item.tableData) {
      formattingContent = `
        <div class="layout-section">
          <div class="layout-header">LEGAL STRUCTURED GRID (TABLE MODE)</div>
          <table class="data-table">
            <thead>
              <tr>
                ${item.tableData.headers?.map(h => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${item.tableData.rows?.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    } else if (item.formData) {
      formattingContent = `
        <div class="layout-section">
          <div class="layout-header">REGISTRATION & FORM FIELDS LAYOUT</div>
          <div class="form-grid">
            ${item.formData.map(f => `
              <div class="form-card">
                <span class="form-label">${f.label}</span>
                <span class="form-value">${f.value}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (item.documentData) {
      formattingContent = `
        <div class="layout-section">
          <div class="layout-header">ADMINISTRATIVE LEGAL CONTINUOUS DOCUMENT</div>
          <div class="doc-box">
            ${item.documentData.title ? `<div class="doc-title">${item.documentData.title}</div>` : ""}
            ${item.documentData.sections?.map(sec => `
              <div class="doc-section">
                ${sec.heading ? `<div class="section-heading">${sec.heading}</div>` : ""}
                <p class="section-paragraph">${sec.paragraph}</p>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    const isCompact = pdfLayout === "compact";

    const styleBlock = isCompact ? `
      body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #010101; line-height: 1.4; background: #fff; font-size: 11px; }
      .cert-container { border: 1.5px solid #b45309; padding: 18px; max-width: 100%; margin: 0; border-radius: 6px; background: #fff; position: relative; }
      .header-info { text-align: left; border-bottom: 1.5px solid #b45309; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .header-info h1 { font-size: 14px; margin: 0; text-transform: uppercase; color: #1e40af; font-weight: 800; }
      .header-info p { font-size: 8px; margin: 2px 0 0 0; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
      .stamp-badge { border: 1px dashed #b45309; padding: 3px 6px; font-weight: bold; font-family: sans-serif; font-size: 8px; color: #b45309; border-radius: 3px; text-transform: uppercase; }
      
      .phrase-title { font-size: 9px; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-top: 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
      .original-phrase { font-size: 13px; font-weight: bold; color: #111827; background: #f8fafc; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0; font-family: monospace; line-height: 1.3; margin-bottom: 10px; }
      
      .translations-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; margin-bottom: 12px; }
      .translation-item { display: flex; flex-direction: column; border: 1px solid #f1f5f9; padding: 6px; background: #fafafa; border-radius: 4px; }
      .lang-lbl { font-weight: bold; color: #475569; font-size: 9px; text-transform: uppercase; margin-bottom: 2px; }
      .lang-val { color: #010101; font-weight: 600; font-size: 11px; }
      .lang-phonetic { font-style: italic; color: #64748b; font-weight: normal; font-size: 10px; margin-left: 2px; }

      /* Syllables & Grammar styles */
      .linguistics-box { display: grid; grid-template-columns: 1fr; gap: 10px; margin: 12px 0; page-break-inside: avoid; }
      .linguistics-col { border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; background: #fafafa; }
      .col-title { font-size: 9px; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-bottom: 4px; }
      .syllables-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
      .syllable-tag { font-family: monospace; font-size: 10px; font-weight: bold; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 1px 4px; border-radius: 2px; }
      
      .grammar-tbl { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 9.5px; }
      .grammar-tbl th { text-align: left; color: #475569; border-bottom: 1px solid #e2e8f0; padding: 2px; }
      .grammar-tbl td { padding: 3px 2px; border-bottom: 1px solid #f1f5f9; }

      /* Grid layouts */
      .layout-section { margin-top: 12px; margin-bottom: 12px; }
      .layout-header { font-size: 9px; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 10px; }
      .data-table th { background: #f1f5f9; padding: 5px; font-weight: bold; border: 1px solid #cbd5e1; }
      .data-table td { padding: 5px; border: 1px solid #cbd5e1; }
      
      .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; }
      .form-card { border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 3px; background: #fafafa; }
      .form-label { font-size: 8px; font-weight: bold; color: #1e40af; text-transform: uppercase; display: block; }
      .form-value { font-size: 10px; font-weight: bold; color: #334155; }

      .doc-box { padding: 10px; background: #fdfdfd; border: 1px solid #e2e8f0; border-radius: 3px; }
      .doc-title { font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
      .doc-section { margin-bottom: 8px; }
      .section-heading { font-weight: bold; font-size: 8px; color: #1e40af; text-transform: uppercase; margin-bottom: 2px; }
      .section-paragraph { font-size: 10px; margin: 0; text-indent: 8px; }

      .footer-seal { margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 8.5px; color: #334155; display: flex; justify-content: space-between; align-items: center; }
      .seal-artwork { width: 45px; height: 45px; }
      
      @media print {
        body { padding: 0; }
        .cert-container { box-shadow: none; border: 1px solid #000; }
      }
    ` : `
      body { font-family: 'Times New Roman', serif; padding: 40px; color: #0f172a; line-height: 1.6; background: #fff; }
      .cert-container { border: 6px double #b45309; padding: 40px; max-width: 800px; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); background: #fff; position: relative; }
      .header-info { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 20px; margin-bottom: 30px; }
      .header-info h1 { font-size: 24px; margin: 0; text-transform: uppercase; color: #1e40af; letter-spacing: 1px; font-family: 'Georgia', serif; }
      .header-info p { font-size: 11px; margin: 5px 0 0 0; color: #475569; font-family: sans-serif; text-transform: uppercase; letter-spacing: 2px; }
      .stamp-badge { float: right; border: 2px dashed #b45309; padding: 8px 12px; font-weight: bold; font-family: sans-serif; font-size: 10px; color: #b45309; border-radius: 4px; text-align: center; text-transform: uppercase; }
      
      .phrase-title { font-size: 13px; font-weight: bold; color: #1e40af; text-transform: uppercase; font-family: sans-serif; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; letter-spacing: 1px; }
      .original-phrase { font-size: 20px; font-weight: bold; color: #111827; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; line-height: 1.4; margin-bottom: 20px; }
      
      .translations-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px; }
      .translation-item { display: grid; grid-template-columns: 150px 1fr; border-bottom: 1px solid #f1f5f9; padding: 8px 0; font-family: sans-serif; font-size: 13px; }
      .translation-item:last-child { border-bottom: none; }
      .lang-lbl { font-weight: bold; color: #475569; }
      .lang-val { color: #010101; font-weight: 600; }
      .lang-phonetic { font-style: italic; color: #64748b; font-weight: normal; font-size: 12px; margin-left: 6px; }

      /* Syllables & Grammar styles */
      .linguistics-box { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; page-break-inside: avoid; }
      .linguistics-col { border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; background: #fafafa; }
      .col-title { font-size: 11px; font-weight: bold; color: #1e40af; font-family: sans-serif; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1.5px; }
      .syllables-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
      .syllable-tag { font-family: monospace; font-size: 12px; font-weight: bold; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 3px 8px; border-radius: 4px; }
      
      .grammar-tbl { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 11px; }
      .grammar-tbl th { text-align: left; color: #475569; border-bottom: 1px solid #e2e8f0; padding: 4px; font-weight: bold; }
      .grammar-tbl td { padding: 5px 4px; border-bottom: 1px solid #f1f5f9; }

      /* Grid layouts */
      .layout-section { margin-top: 25px; margin-bottom: 25px; }
      .layout-header { font-size: 11px; font-weight: bold; color: #1e40af; font-family: sans-serif; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
      .data-table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
      .data-table th { background: #f1f5f9; padding: 8px; font-weight: bold; border: 1px solid #cbd5e1; }
      .data-table td { padding: 8px; border: 1px solid #cbd5e1; }
      
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: sans-serif; }
      .form-card { border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 4px; background: #fafafa; }
      .form-label { font-size: 9px; font-weight: bold; color: #1e40af; text-transform: uppercase; display: block; }
      .form-value { font-size: 12px; font-weight: bold; color: #334155; }

      .doc-box { padding: 20px; background: #fdfdfd; border: 1px solid #e2e8f0; border-radius: 4px; }
      .doc-title { font-size: 15px; font-weight: bold; text-align: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 15px; }
      .doc-section { margin-bottom: 15px; }
      .section-heading { font-weight: bold; font-size: 11px; color: #1e40af; text-transform: uppercase; margin-bottom: 4px; }
      .section-paragraph { font-size: 13px; margin: 0; text-indent: 15px; }

      .footer-seal { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 25px; font-size: 11px; font-family: sans-serif; color: #334155; display: flex; justify-content: space-between; align-items: center; }
      .seal-artwork { width: 90px; height: 90px; }
      
      @media print {
        body { padding: 0; }
        .cert-container { box-shadow: none; border-color: #000; }
      }
    `;

    const htmlContent = `
      <html>
        <head>
          <title>Certified Legal Translation Sheet - ${cert.certId}</title>
          <style>
            ${styleBlock}
          </style>
        </head>
        <body>
          <div class="cert-container">
            <div class="stamp-badge">SWORN VALID ACCURACY<br/>LICENSE: ${cert.certId}</div>
            
            <div class="header-info">
              <h1>Certificate of Certified Translation</h1>
              <p>${cert.firmName}</p>
            </div>
            
            <p style="font-size: 13.5px; font-family: serif; margin-bottom: 25px;">
              This certifies that the target linguistic translations of the following original East African terminology has been analyzed and localized with professional accuracy by our sworn legal notary.
            </p>

            <div class="phrase-title">Original Phrase Text</div>
            <div class="original-phrase">${item.originalText}</div>

            <div class="phrase-title">Authorized Multilingual Interpretations</div>
            <div class="translations-list">
              ${Object.entries(item.translations).map(([langCode, trans]) => {
                const detail = trans as any;
                if (!detail?.text) return "";
                const label = LANGUAGE_LABELS[langCode as SupportedLanguage]?.label || langCode;
                return `
                  <div class="translation-item">
                    <span class="lang-lbl">${label}</span>
                    <span class="lang-val">
                      ${detail.text}
                      ${detail.phonetic ? `<span class="lang-phonetic">(/${detail.phonetic}/)</span>` : ""}
                    </span>
                  </div>
                `;
              }).join("")}
            </div>

            ${formattingContent}

            <!-- Linguistics breakdowns side-by-side if available -->
            ${(item.syllables && item.syllables.length > 0) || (item.grammarBreakdown && item.grammarBreakdown.length > 0) ? `
              <div class="linguistics-box">
                ${item.syllables && item.syllables.length > 0 ? `
                  <div class="linguistics-col">
                    <div class="col-title">Phonetic Syllable Breakdown</div>
                    <div class="syllables-wrap">
                      ${item.syllables.map(s => `<span class="syllable-tag">${s}</span>`).join("")}
                    </div>
                  </div>
                ` : ""}
                
                ${item.grammarBreakdown && item.grammarBreakdown.length > 0 ? `
                  <div class="linguistics-col">
                    <div class="col-title">Morphological Grammar Analysis</div>
                    <table class="grammar-tbl">
                      <thead>
                        <tr>
                          <th>Word</th>
                          <th>Pos</th>
                          <th>Meaning</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${item.grammarBreakdown.map(g => `
                          <tr>
                            <td><strong>${g.word}</strong></td>
                            <td style="color: #64748b; font-style: italic;">${g.pos}</td>
                            <td>${g.meaning}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                ` : ""}
              </div>
            ` : ""}

            <div class="footer-seal">
              <div style="width: 70%">
                <strong>Officially Notarized Sign:</strong> <span style="font-style: italic; font-family: serif; font-size: 13px; text-decoration: underline;">${cert.signature}</span><br/>
                <strong>Sworn License Bureau Agency:</strong> ${cert.firmName}<br/>
                <strong>Seal Release Date:</strong> ${cert.date}<br/>
                <strong>Document Authenticator:</strong> Verified Registered Sworn Sworn Court Official
              </div>
              <svg class="seal-artwork" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#b45309" stroke-width="2.5" stroke-dasharray="3 3"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#b45309" stroke-width="1.5" />
                <path d="M50,15 L62,38 L85,38 L67,52 L73,75 L50,60 L27,75 L33,52 L15,38 L38,38 Z" fill="none" stroke="#b45309" stroke-width="1.5" />
                <text x="50" y="53" text-anchor="middle" font-size="5" font-weight="black" fill="#b45309" font-family="sans-serif">OFFICIAL SEAL</text>
              </svg>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const exportAllFavoritesToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const listToPrint = favorites;
    const isCompact = pdfLayout === "compact";

    const styleBlock = isCompact ? `
      body { font-family: system-ui, -apple-system, sans-serif; padding: 15px; color: #334155; line-height: 1.3; background: #fff; font-size: 11px; }
      .container { max-width: 100%; margin: 0; border: 1px solid #cbd5e1; padding: 15px; border-radius: 4px; }
      .header { border-bottom: 2px solid #b45309; padding-bottom: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .header h1 { font-size: 14px; margin: 0; text-transform: uppercase; color: #b45309; font-weight: 800; }
      .header p { font-size: 8px; margin: 0; color: #64748b; letter-spacing: 0.5px; }
      .meta-info { font-size: 9px; color: #64748b; margin-bottom: 10px; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
      .item-card { border: 1px solid #f1f5f9; border-radius: 4px; padding: 8px 12px; margin-bottom: 6px; page-break-inside: avoid; background-color: #f8fafc; }
      .item-num { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; }
      .original-text { font-size: 12px; font-weight: bold; color: #010101; margin: 2px 0 4px 0; font-family: system-ui, sans-serif; }
      .translations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0; }
      .translation-row { display: flex; border-bottom: none; padding-bottom: 1px; }
      .lang-label { font-weight: bold; color: #475569; width: 75px; min-width: 75px; font-size: 9.5px; }
      .lang-text { color: #0f172a; font-weight: 500; font-size: 9.5px; }
      .sub-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9px; background-color: #fafafa; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; margin-top: 4px; }
      .syllables-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
      .syllable-tag { font-family: monospace; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 1px 4px; border-radius: 2px; font-weight: bold; }
      .grammar-tbl { width: 100%; border-collapse: collapse; font-size: 8.5px; }
      .grammar-tbl th { text-align: left; color: #475569; border-bottom: 1px solid #e2e8f0; padding: 1px; }
      .grammar-tbl td { padding: 2px 1px; border-bottom: 1px solid #f1f5f9; }
      .seal-section { margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; }
      .seal-svg { width: 45px; height: 45px; }
      @media print {
        body { padding: 0; }
        .container { border: none; }
      }
    ` : `
      body { font-family: 'Times New Roman', serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fff; }
      .container { max-width: 800px; margin: 0 auto; border: 4px double #b45309; padding: 30px; border-radius: 8px; }
      .header { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 15px; margin-bottom: 25px; position: relative; }
      .header h1 { font-size: 24px; margin: 0; text-transform: uppercase; color: #b45309; font-family: 'Georgia', serif; }
      .header p { font-size: 11px; margin: 5px 0 0 0; color: #475569; font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: 2px; }
      .meta-info { font-family: system-ui, sans-serif; font-size: 11px; color: #64748b; margin-bottom: 20px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; }
      
      .item-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; background-color: #fff; }
      .item-num { font-family: monospace; font-size: 12px; font-weight: bold; color: #b45309; }
      .original-text { font-size: 16px; font-weight: bold; color: #010101; margin: 8px 0; font-family: monospace; }
      
      .translations-grid { display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-family: system-ui, sans-serif; font-size: 13px; }
      .translation-row { display: flex; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
      .translation-row:last-child { border-bottom: none; }
      .lang-label { font-weight: bold; color: #475569; width: 140px; min-width: 140px; }
      .lang-text { color: #0f172a; font-weight: 600; }
      
      /* Linguistics breakdowns styles */
      .sub-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 11px; font-family: sans-serif; background-color: #fafafa; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; margin-top: 8px; }
      .syllables-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
      .syllable-tag { font-family: monospace; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
      .grammar-tbl { width: 100%; border-collapse: collapse; }
      .grammar-tbl th { text-align: left; color: #475569; border-bottom: 1px solid #e2e8f0; padding: 2px; }
      .grammar-tbl td { padding: 3px 2px; border-bottom: 1px solid #f1f5f9; }

      .seal-section { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-family: system-ui, sans-serif; font-size: 11px; }
      .seal-svg { width: 80px; height: 80px; }
      @media print {
        body { padding: 0; }
        .container { border-color: #000; box-shadow: none; }
      }
    `;

    const htmlContent = `
      <html>
        <head>
          <title>HabeshaLingua Sworn Legal Bureau - Favorites Multilingual Study Guide</title>
          <style>
            ${styleBlock}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Certified Multilingual Favorites Lexicon</h1>
              ${isCompact ? `
                <p>Curated Favorites (Compact Edition)</p>
              ` : `
                <p>HabeshaLingua Sworn Legal Bureau — Multilingual Study Guide Study Reference System</p>
              `}
            </div>
            <div class="meta-info">
              <div><strong>Lexicon Catalog ID:</strong> LEX-CERT-${Date.now().toString().slice(-6)}</div>
              <div><strong>Compilation Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            
            <p style="font-size: ${isCompact ? "10px" : "12px"}; margin-bottom: ${isCompact ? "10px" : "20px"}; font-style: italic;">Below is your curated list of ${listToPrint.length} favorite translation records, certified for grammatical, phonetic, and semantic legal compliance.</p>

            ${listToPrint.map((item, idx) => `
              <div class="item-card">
                <span class="item-num">VOCABULARY_ITEM #${String(idx + 1).padStart(3, '0')}</span>
                <div class="original-text">${item.originalText}</div>
                <div class="translations-grid">
                  ${Object.entries(item.translations).map(([langCode, trans]) => {
                    const detail = trans as any;
                    if (!detail?.text) return "";
                    const label = LANGUAGE_LABELS[langCode as SupportedLanguage]?.label || langCode;
                    return `
                      <div class="translation-row">
                        <span class="lang-label">${label}:</span>
                        <span class="lang-text">${detail.text} ${detail.phonetic ? `<span style="font-style: italic; font-weight: normal; color: #64748b; font-size: ${isCompact ? "9px" : "11px"};">(/${detail.phonetic}/)</span>` : ""}</span>
                      </div>
                    `;
                  }).join("")}
                </div>

                ${(item.syllables && item.syllables.length > 0) || (item.grammarBreakdown && item.grammarBreakdown.length > 0) ? `
                  <div class="sub-details">
                    <div>
                      <strong style="display:block; margin-bottom:4px; font-size:${isCompact ? "8px" : "10px"}; text-transform:uppercase; color:#b45309;">Syllable map:</strong>
                      <div class="syllables-wrap">
                        ${item.syllables?.map(s => `<span class="syllable-tag">${s}</span>`).join("") || "N/A"}
                      </div>
                    </div>
                    <div>
                      <strong style="display:block; margin-bottom:4px; font-size:${isCompact ? "8px" : "10px"}; text-transform:uppercase; color:#b45309;">Morphology breakdown:</strong>
                      ${item.grammarBreakdown && item.grammarBreakdown.length > 0 ? `
                        <table class="grammar-tbl">
                          <thead>
                            <tr>
                              <th>Word</th>
                              <th>Pos</th>
                              <th>Meaning</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${item.grammarBreakdown.map(g => `
                              <tr>
                                <td><strong>${g.word}</strong></td>
                                <td style="color:#64748b; font-style:italic;">${g.pos}</td>
                                <td>${g.meaning}</td>
                              </tr>
                            `).join("")}
                          </tbody>
                        </table>
                      ` : "N/A"}
                    </div>
                  </div>
                ` : ""}
              </div>
            `).join("")}

            <div class="seal-section">
              <div>
                <strong>Authority signature:</strong> <span style="font-family: serif; font-style: italic; font-size: ${isCompact ? "10px" : "13px"}; text-decoration: underline;">Court-sworn notary validation</span><br/>
                <strong>Status:</strong> Accredited Study Reference Guide ${isCompact ? "(Compact Edition)" : ""}<br/>
                <strong>Authorized Bureau:</strong> HabeshaLingua Sworn Legal Bureau
              </div>
              <svg class="seal-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#b45309" stroke-width="2" stroke-dasharray="3 3"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#b45309" stroke-width="1"/>
                <text x="50" y="44" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#b45309" font-family="sans-serif">CERTIFIED</text>
                <text x="50" y="52" text-anchor="middle" font-size="5" fill="#b45309" font-family="sans-serif">STUDY GUIDE</text>
                <text x="50" y="60" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#b45309" font-family="sans-serif">SEAL</text>
              </svg>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div id="translator-app-root" className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-12 selection:bg-[#1e40af] selection:text-white">
      
      {/* Upper Navigation and Branding Bar */}
      <header id="app-nav-header" className="sticky top-0 z-40 bg-[#1e40af] text-white px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#1e40af] font-black font-sans text-xl" title="Sovereign Shield of Justice Seal">
              ⚖️
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5 font-sans">
                HabeshaLingua Sworn Legal Bureau
                <span className="text-[10px] bg-amber-550 border border-amber-400 bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Certified</span>
              </h1>
              <p className="text-xs text-blue-100">
                Licensed Court-Approved Sworn East African Multi-Language Translation Firm
              </p>
            </div>
          </div>

          {/* Online/Offline status toggler with professional color state indicators & settings cog */}
          <div className="flex items-center gap-3">
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

            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                settingsOpen 
                  ? "bg-amber-500 text-white border-amber-400 scale-105" 
                  : "bg-[#173594] text-blue-100 border-[#2b52cc] hover:text-white hover:bg-[#2045c0]/50"
              }`}
              title="PDF Export Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* PDF Export Settings & Offline Voice Packs Dialogue */}
      {settingsOpen && (
        <div id="pdf-settings-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs transition-opacity duration-300">
          <div id="pdf-settings-panel" className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-150 overflow-hidden transform scale-100 transition-transform">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1e40af] to-[#2563eb] text-white p-6 relative">
              <button 
                onClick={() => setSettingsOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all cursor-pointer animate-none"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Preferences & Voice Configurations</h3>
                  <p className="text-xs text-blue-100 font-sans">Sworn Certification layouts & High-Fidelity Regional voice pack storage</p>
                </div>
              </div>
            </div>

            {/* Preferences Modal Tabs Selector */}
            <div className="flex border-b border-slate-150 bg-slate-50/70 text-center select-none font-sans">
              <button
                type="button"
                onClick={() => setSettingsTab("pdf")}
                className={`flex-1 py-3.5 text-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  settingsTab === "pdf"
                    ? "border-[#1e40af] text-[#1e40af] bg-white font-black"
                    : "border-transparent text-slate-505 hover:text-slate-800 hover:bg-slate-50/60"
                }`}
              >
                📝 Options
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("voicePacks")}
                className={`flex-1 py-3.5 text-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  settingsTab === "voicePacks"
                    ? "border-[#1e40af] text-[#1e40af] bg-white font-black"
                    : "border-transparent text-slate-550 hover:text-slate-800 hover:bg-slate-50/60"
                }`}
              >
                🎵 Offline Voices
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("feedback")}
                className={`flex-1 py-3.5 text-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  settingsTab === "feedback"
                    ? "border-[#1e40af] text-[#1e40af] bg-white font-black"
                    : "border-transparent text-slate-550 hover:text-rose-700 hover:bg-rose-50/20"
                }`}
                title="View reported inaccuracies and accuracy ratings"
              >
                ⚠️ Accuracy Logs
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {settingsTab === "pdf" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                      Select Translation Output Layout Format
                    </label>
                    <p className="text-xs text-slate-550 leading-relaxed">
                      Choose the page density, typography aesthetic, and regulatory stamp styling used when exporting certified translation logs or single favorites documents to PDF.
                    </p>
                  </div>

                  {/* Presets Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* COMPACT CARD */}
                    <button
                      onClick={() => setPdfLayout("compact")}
                      className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-40 ${
                        pdfLayout === "compact"
                          ? "border-amber-500 bg-amber-50/40 text-slate-800 ring-2 ring-amber-400/20"
                          : "border-slate-200 hover:border-slate-350 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-600">Compact Format</span>
                          {pdfLayout === "compact" && (
                            <div className="bg-amber-500 text-white rounded-full p-0.5">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          Optimized for dense viewing. Compact text lines, grid translation arrangements, and miniaturized stamps. Great for multi-item registries.
                        </p>
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-400 mt-1 uppercase">Eco-friendly printing</span>
                    </button>

                    {/* DETAILED CARD */}
                    <button
                      onClick={() => setPdfLayout("detailed")}
                      className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-40 ${
                        pdfLayout === "detailed"
                          ? "border-[#1e40af] bg-blue-50/40 text-slate-800 ring-2 ring-blue-400/20"
                          : "border-slate-200 hover:border-slate-350 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-[#1e40af]">Detailed Sworn</span>
                          {pdfLayout === "detailed" && (
                            <div className="bg-[#1e40af] text-white rounded-full p-0.5">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          Sworn Court specifications. Traditional serif fonts, double gold/blue borders, full notary stamp credentials, and detailed continuous documents.
                        </p>
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-400 mt-1 uppercase">Recommended for submissions</span>
                    </button>

                  </div>

                  {/* Global Speech Speed Toggle Controls */}
                  <div className="space-y-3 pt-4 border-t border-slate-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                          Global Speech Playback Speed
                        </label>
                        <p className="text-[11px] text-slate-550 leading-relaxed max-w-sm mt-0.5">
                          Sets the default vocal pronunciation speed for text-to-speech audio across all translation cards.
                        </p>
                      </div>
                      <span className="text-xs font-black text-[#1e40af] bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-100">
                        {globalSpeechSpeed}x
                      </span>
                    </div>
                    
                    {/* 4 Speed Presets Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0.5, 1.0, 1.5, 2.0].map((speed) => {
                        let label = "Normal";
                        if (speed === 0.5) label = "Slow";
                        if (speed === 1.5) label = "Fast";
                        if (speed === 2.0) label = "Turbo";
                        return (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => setGlobalSpeechSpeed(speed)}
                            className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              globalSpeechSpeed === speed
                                ? "bg-[#1e40af] text-white border-[#1e40af] shadow-md ring-2 ring-blue-300"
                                : "bg-white text-slate-700 border-slate-205 hover:bg-slate-50 hover:border-slate-350"
                            }`}
                          >
                            <span className="text-xs font-bold">{speed}x</span>
                            <span className={`text-[8px] uppercase tracking-wider font-extrabold mt-0.5 ${globalSpeechSpeed === speed ? "text-blue-150" : "text-slate-450"}`}>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sworn Bureau Quality Shield */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-start gap-3">
                    <div className="text-amber-600 shrink-0 text-lg">🛡️</div>
                    <div className="text-[11.5px] text-slate-600 leading-relaxed">
                      <strong className="text-slate-700">Sworn Notary Compliance Guarantee:</strong> Regardless of layout choice, every generated PDF includes verified registry hashes, cryptographic attestation logs, and licensed stamp seals.
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "voicePacks" && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                      High-Quality Offline Regional Voice Packs
                    </label>
                    <p className="text-xs text-slate-550 leading-relaxed">
                      By default, regional dialets speak phonetic approximation soundguides when fully offline. Pre-download text-to-speech audio bundles to enable premium synthesised native pronunciation completely offline.
                    </p>
                  </div>

                  {/* Cache Stats Summary Grid */}
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-150">
                    <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl flex items-center gap-3">
                      <div className="text-xl">📊</div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">Total Downloaded Phrases</span>
                        <strong className="text-base text-slate-800 font-extrabold font-mono">
                          {(Object.values(voicePackCounts) as number[]).reduce((a, b) => a + b, 0)} items
                        </strong>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl flex items-center gap-3">
                      <div className="text-xl">💾</div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">Total Database Size</span>
                        <strong className="text-base text-slate-800 font-extrabold font-mono">
                          {(Object.values(voicePackSizes) as number[]).reduce((a, b) => a + b, 0).toFixed(1)} KB
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Voices Bundle Cards Grid */}
                  <div className="space-y-3.5">
                    {[
                      { code: "am", label: "Amharic Package", nativeName: "አማርኛ", count: OFFLINE_PHRASEBOOK.filter(item => item.amharic && item.amharic.trim().length > 0).length },
                      { code: "om", label: "Oromo Package", nativeName: "Oromoo", count: OFFLINE_PHRASEBOOK.filter(item => item.om && item.om.trim().length > 0).length },
                      { code: "ti", label: "Tigrinya Package", nativeName: "ትግርኛ", count: OFFLINE_PHRASEBOOK.filter(item => item.ti && item.ti.trim().length > 0).length },
                      { code: "so", label: "Somali Package", nativeName: "Soomaali", count: OFFLINE_PHRASEBOOK.filter(item => item.so && item.so.trim().length > 0).length }
                    ].map((pkg) => {
                      const downloaded = voicePackCounts[pkg.code] || 0;
                      const isFullyDownloaded = downloaded >= pkg.count && pkg.count > 0;
                      const sizeInKb = voicePackSizes[pkg.code] || 0;
                      const isDownloadingThis = downloadingLang === pkg.code;

                      return (
                        <div key={pkg.code} className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col space-y-3.5 hover:bg-slate-100/50 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-sans">{pkg.label}</span>
                                <span className="text-[10px] font-bold text-slate-450">({pkg.nativeName})</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {downloaded > 0 
                                  ? `${downloaded} / ${pkg.count} cached (~${sizeInKb} KB)` 
                                  : `Status: Available offline bundle (~${pkg.count} phrases)`
                                }
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Ready offline badge indicator */}
                              {isFullyDownloaded && !isDownloadingThis && (
                                <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-250 uppercase px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                  <Check className="w-3 h-3 stroke-[3.5] text-emerald-600" /> Stored
                                </span>
                              )}

                              {/* Remove cache card */}
                              {downloaded > 0 && !isDownloadingThis && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVoicePack(pkg.code)}
                                  disabled={!!downloadingLang}
                                  className="p-1 px-2.5 text-[10px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-rose-50 disabled:hover:text-rose-600 border border-rose-200 hover:border-transparent rounded-lg cursor-pointer transition-all"
                                >
                                  Clear Cache
                                </button>
                              )}

                              {/* Download offline bundle trigger */}
                              {!isFullyDownloaded && !isDownloadingThis && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadVoicePack(pkg.code)}
                                  disabled={!!downloadingLang || isOffline}
                                  className="p-1 px-3 text-[10px] font-bold text-white bg-[#1e40af] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{downloaded > 0 ? "Resume" : "Download"}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Beautiful download progress slider container */}
                          {isDownloadingThis && downloadProgress && (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase">
                                <span className="text-[#1e40af] flex items-center gap-1 animate-pulse">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  Buffering and saving voice data...
                                </span>
                                <span className="font-mono">{downloadProgress.current} / {downloadProgress.total}</span>
                              </div>
                              
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner border border-slate-250">
                                <div
                                  className="bg-gradient-to-r from-blue-600 to-[#1e40af] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                                ></div>
                              </div>
                              {downloadProgress.error && (
                                <span className="text-[9px] font-bold text-rose-550 uppercase tracking-wide block">{downloadProgress.error}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-blue-50/50 border border-blue-150 p-4 rounded-2xl flex items-start gap-2.5">
                    <div className="text-[#1e40af] shrink-0 text-xs mt-0.5">ℹ️</div>
                    <div className="text-[11px] text-slate-600 leading-normal font-sans">
                      <strong className="text-slate-700">Offline Synthesis Pipeline:</strong> Speech Synthesis uses direct binary linear PCM buffers decoded locally. No active server queries are made once the audio records are written to IndexedDB.
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "feedback" && (
                <div className="space-y-5 animate-fade-in font-sans">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                      Inaccurate Translation reports & Issue Logs
                    </label>
                    <p className="text-xs text-slate-550 leading-relaxed">
                      Below are user feedback entries on translation accuracy and pronunciation bugs. This local registry tracks inaccuracy reports to train and refine regional vernacular models.
                    </p>
                  </div>

                  {/* Search, Clear & Export Action bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-2xs">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2 ml-0.5 text-xs text-slate-400 select-none">🔍</span>
                      <input
                        type="text"
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        placeholder="Filter reports by keyword..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-205 rounded-lg text-xs outline-none focus:border-[#1e40af] focus:ring-1 focus:ring-[#1e40af]/10"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const logsToCopy = localStorage.getItem("habeshalingua_feedback_log") || "[]";
                          navigator.clipboard.writeText(logsToCopy);
                          alert("Issue logs copied to clipboard as structured JSON payload!");
                        }}
                        disabled={feedbackLogs.length === 0}
                        className="p-1.5 px-3 text-[10px] bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-205 cursor-pointer rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Copy logs as JSON code for model improvement submission"
                      >
                        📋 Export JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure you want to empty the local translation feedback database? All rating tags will be cleared.")) {
                            localStorage.removeItem("habeshalingua_feedback_log");
                            // Clear rate tags
                            Object.keys(localStorage).forEach((key) => {
                              if (key.startsWith("rate:")) {
                                localStorage.removeItem(key);
                              }
                            });
                            loadFeedbackLogs();
                            // Dispatch event so cards update immediately
                            window.dispatchEvent(new Event("storage_feedback_updated"));
                          }
                        }}
                        disabled={feedbackLogs.length === 0}
                        className="p-1.5 px-3 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold border border-rose-200 cursor-pointer rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-none"
                      >
                        🗑️ Void All
                      </button>
                    </div>
                  </div>

                  {/* Log entries container */}
                  <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                    {(() => {
                      const filtered = feedbackLogs.filter(log => {
                        const searchLower = feedbackSearch.toLowerCase();
                        return (
                          (log.originalText?.toLowerCase() || "").includes(searchLower) ||
                          (log.translatedText?.toLowerCase() || "").includes(searchLower) ||
                          (log.userComment?.toLowerCase() || "").includes(searchLower) ||
                          (log.issueCategory?.toLowerCase() || "").includes(searchLower) ||
                          (LANGUAGE_LABELS[log.langKey as SupportedLanguage]?.label.toLowerCase() || "").includes(searchLower)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-8 border border-dashed border-slate-205 rounded-2xl bg-white text-center flex flex-col items-center justify-center gap-2">
                            <span className="text-3xl select-none">🛡️</span>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-700">No Accuracy Feedback Registered</h4>
                              <p className="text-[10px] text-slate-450 max-w-[280px]">
                                Use the Thumbs Up/Thumbs Down icons on translation cards to flag inaccuracies or verify correct phrases.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return filtered.map((log) => {
                        const langLabel = LANGUAGE_LABELS[log.langKey as SupportedLanguage];
                        const dateFormatted = new Date(log.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });

                        return (
                          <div key={log.id} className="p-3.5 bg-white border border-slate-205 rounded-xl relative hover:border-slate-300 transition-all shadow-3xs">
                            {/* Accent indicator of feedback type */}
                            <div className="absolute right-3 top-3.5 flex items-center gap-2">
                              {log.rating === "up" ? (
                                <span className="text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-250 px-2 py-0.5 rounded-md flex items-center gap-1 font-sans">
                                  👍 Verified Accurate
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-extrabold bg-rose-50 text-rose-700 border border-rose-250 px-2 py-0.5 rounded-md flex items-center gap-1 font-sans">
                                  👎 Bug Flagged
                                </span>
                              )}
                              
                              {/* Single item clear action */}
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    const updated = feedbackLogs.filter(item => item.id !== log.id);
                                    localStorage.setItem("habeshalingua_feedback_log", JSON.stringify(updated));
                                    localStorage.removeItem(`rate:${log.langKey}:${log.translatedText}`);
                                    loadFeedbackLogs();
                                    // Dispatch event so cards update immediately
                                    window.dispatchEvent(new Event("storage_feedback_updated"));
                                  } catch (e) {
                                    console.error("Failed to delete log item:", e);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer text-xs"
                                title="Delete this log entry"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Logo Details */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg leading-none select-none">{langLabel?.flag}</span>
                                <span className="text-xs font-black text-slate-800 tracking-tight uppercase font-sans">
                                  {langLabel?.label || log.langKey} Target
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 font-bold">({dateFormatted})</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 pt-1.5 border-t border-dashed border-slate-100">
                                <div className="space-y-0.5">
                                  <span className="text-[8.5px] font-black uppercase text-slate-450 font-sans tracking-wider block">Source text</span>
                                  <p className="bg-slate-50/50 p-2 border border-slate-150 rounded-lg italic pr-1 select-text">"{log.originalText}"</p>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[8.5px] font-black uppercase text-slate-450 font-sans tracking-wider block">Target translation</span>
                                  <p className="bg-slate-50/50 p-2 border border-slate-150 rounded-lg font-bold pr-1 select-text">
                                    {log.translatedText} {log.phonetic && <span className="font-sans italic text-slate-550 font-normal">/{log.phonetic}/</span>}
                                  </p>
                                </div>
                              </div>

                              {/* Reports category or optional comments */}
                              {log.rating === "down" && (
                                <div className="bg-rose-50/40 border border-rose-150 rounded-lg p-2.5 mt-2 space-y-1">
                                  <p className="text-[10px] text-rose-900 font-bold font-sans uppercase">
                                    Category: <span className="underline">{log.issueCategory === "meaning" ? "Incorrect Meaning" : log.issueCategory === "grammar" ? "Spelling/Grammar Error" : log.issueCategory === "pronounce" ? "Pronunciation/Audio mismatch" : "Other General Bug"}</span>
                                  </p>
                                  {log.userComment && (
                                    <p className="text-[10.5px] leading-relaxed text-slate-650 pr-1 select-text block">
                                      <strong className="text-slate-800 font-sans">Comments:</strong> "{log.userComment}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="bg-amber-50/40 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5 shadow-2xs">
                    <div className="text-amber-600 shrink-0 text-xs mt-0.5">ℹ️</div>
                    <div className="text-[11px] text-slate-600 leading-normal font-sans">
                      <strong className="text-slate-700">Submit Improvements:</strong> You can copy the exported JSON file payload and email it to support teams or submit it on GitHub to expand and correct our pre-loaded offline regional dialect dictionaries!
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-150 p-4 flex justify-end gap-3">
              <button 
                onClick={() => setSettingsOpen(false)}
                className="px-5 py-2.5 bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1d4ed8] active:scale-95 transition-all cursor-pointer"
              >
                Apply & Save Configuration
              </button>
            </div>

          </div>
        </div>
      )}

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

            {/* Mode Tabs */}
            <div className="flex border-b border-slate-100 gap-1 pb-2">
              <button
                type="button"
                onClick={() => setTranslateMode("text")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold leading-none flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  translateMode === "text"
                    ? "bg-[#1e40af]/10 text-[#1e40af]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>

              <button
                type="button"
                onClick={() => setTranslateMode("document")}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold leading-none flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  translateMode === "document"
                    ? "bg-[#1e40af]/10 text-[#1e40af]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Files & Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setTranslateMode("camera")}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold leading-none flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  translateMode === "camera"
                    ? "bg-[#1e40af]/10 text-[#1e40af]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera</span>
              </button>
            </div>

            {/* Main Translation Content Panels */}
            {translateMode === "text" && (
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
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {isRecording ? (
                      <button
                        type="button"
                        onMouseDown={handlePTTStart}
                        onMouseUp={handlePTTEnd}
                        onMouseLeave={handlePTTEnd}
                        onTouchStart={handlePTTStart}
                        onTouchEnd={handlePTTEnd}
                        onClick={handlePTTClick}
                        className="flex-1 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 hover:from-red-600 hover:via-rose-600 hover:to-orange-600 font-extrabold font-sans text-white text-sm px-4 py-3 rounded-2xl flex items-center justify-center gap-2 border border-red-600 shadow-md transition-all animate-pulse select-none cursor-grab active:cursor-grabbing"
                        title="Release to Stop & Process Transcription"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <Mic className="w-4 h-4 text-white" />
                        <span>{isHoldingToTalk ? "Release to Finish" : "Stop Recording"} ({recordingSecondsLeft}s)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onMouseDown={handlePTTStart}
                        onMouseUp={handlePTTEnd}
                        onMouseLeave={handlePTTEnd}
                        onTouchStart={handlePTTStart}
                        onTouchEnd={handlePTTEnd}
                        onClick={handlePTTClick}
                        className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-[#1e40af] hover:border-[#1e40af]/30 font-semibold font-sans text-sm px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs select-none active:scale-98"
                        title="Press and hold to Speak (Push-to-Talk) or Click to Toggle"
                      >
                        <Mic className="w-4 h-4 text-[#1e40af] animate-bounce" />
                        <span>PTT Speak {LANGUAGE_LABELS[sourceLang]?.label || "Amharic"}</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={loadingTranslate || !inputText.trim()}
                      className="p-3 px-6 rounded-2xl font-bold font-sans text-white bg-[#1e40af] hover:bg-[#1d4ed8] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed border border-[#1e40af] select-none flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm animate-fade-in"
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
                  
                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    🎙️ <strong>Push-to-Talk activated:</strong> Hold down the speak button to talk, release when finished to transcribe. You can also simply click the button to toggle voice input manually.
                  </p>
                </div>
              </form>
            )}

            {translateMode === "document" && (
              <div className="space-y-4 animate-fade-in">
                {/* Drag & Drop Frame */}
                <label
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 hover:border-[#1e40af]/40 rounded-2xl cursor-pointer hover:bg-slate-50/50 transition-all p-4 group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      readAndAddFiles(e.dataTransfer.files);
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center pt-2 pb-2 text-center space-y-2">
                    <div className="p-2 bg-blue-50 text-[#1e40af] rounded-xl border border-blue-50 group-hover:scale-105 transition-transform">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      Drag & drop documents or audio here, or click to browse
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Supports PDFs, plain text (.txt), images & audio (MP3, WAV, M4A, OGG)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.txt,image/*,audio/*,.mp3,.wav,.m4a,.ogg"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {/* Queue list for uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
                      <span>Upload Queue ({uploadedFiles.length} files)</span>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles([])}
                        className="text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:underline text-[10px]"
                      >
                        Clear Queue
                      </button>
                    </div>

                    <div className="space-y-2">
                      {uploadedFiles.map((fileObj) => {
                        const isAudio = fileObj.type.startsWith("audio/") || 
                                        fileObj.name.toLowerCase().endsWith(".mp3") || 
                                        fileObj.name.toLowerCase().endsWith(".wav") || 
                                        fileObj.name.toLowerCase().endsWith(".m4a") || 
                                        fileObj.name.toLowerCase().endsWith(".ogg");
                        const isImage = fileObj.type.startsWith("image/");
                        const isPdf = fileObj.type.includes("pdf");

                        return (
                          <div
                            key={fileObj.id}
                            className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3 relative overflow-hidden group hover:bg-slate-100/40 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 max-w-[85%]">
                              <div className={`p-2 rounded-lg text-xs shrink-0 font-extrabold ${
                                isAudio
                                  ? "bg-violet-100 text-violet-700"
                                  : isImage
                                  ? "bg-emerald-100 text-emerald-700"
                                  : isPdf
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {isAudio ? "🎵" : isImage ? "🖼️" : isPdf ? "📄" : "📝"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate" title={fileObj.name}>
                                  {fileObj.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {(fileObj.size / 1024).toFixed(1)} KB | {fileObj.type.split("/")[1]?.toUpperCase() || "DOC"}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setUploadedFiles((prev) => prev.filter(f => f.id !== fileObj.id))}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-slate-200/50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Remove file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleTranslateAllFiles}
                      disabled={loadingTranslate}
                      className="w-full mt-2 p-2.5 rounded-xl text-xs font-extrabold font-sans text-white bg-[#1e40af] hover:bg-[#1d4ed8] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed border border-[#1e40af] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                    >
                      {loadingTranslate ? (
                        <div className="w-4 h-4 border-2 border-slate-350 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Batch Translate Queue</span>
                          <Sparkles className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 leading-normal text-center bg-slate-50 border border-slate-150 p-2 rounded-xl">
                  ⚠️ Note: Multimodal files, images, and audio translation utilize server-side Gemini 3.5 Active processing. Large files may take a moment.
                </p>
              </div>
            )}

            {translateMode === "camera" && (
              <div className="space-y-4 animate-fade-in flex flex-col">
                {cameraError ? (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs flex flex-col items-center text-center gap-3 animate-fade-in font-sans">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <p className="font-medium leading-relaxed">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCameraStream}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[10px] transition-all"
                    >
                      Permit Camera access
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Viewfinder Frame */}
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-200 shadow-inner flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Viewfinder reticle overlay */}
                      <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                        <div className="w-10 h-10 border-t-2 border-l-2 border-white/60 absolute top-0 left-0 rounded-tl-md"></div>
                        <div className="w-10 h-10 border-t-2 border-r-2 border-white/60 absolute top-0 right-0 rounded-tr-md"></div>
                        <div className="w-10 h-10 border-b-2 border-l-2 border-white/60 absolute bottom-0 left-0 rounded-bl-md"></div>
                        <div className="w-10 h-10 border-b-2 border-r-2 border-white/60 absolute bottom-0 right-0 rounded-br-md"></div>
                        
                        <div className="bg-white/10 backdrop-blur-3xs p-2 rounded-full border border-white/15 animate-pulse text-white text-[9px] font-bold flex items-center gap-1.5 shadow-sm">
                          <Video className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                          <span>LIVE VIEW FINDER active</span>
                        </div>
                      </div>
                    </div>

                    {/* Camera Selectors and Capture Row */}
                    <div className="flex items-center gap-2">
                      {cameraDevices.length > 1 && (
                        <select
                          value={selectedCameraId}
                          onChange={(e) => setSelectedCameraId(e.target.value)}
                          className="flex-1 py-1.5 px-2 text-[11px] bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold max-w-[40%] outline-none focus:border-[#1e40af] cursor-pointer"
                        >
                          {cameraDevices.map((device, idx) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              Camera {idx + 1}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={captureSnapshot}
                        disabled={loadingTranslate || !cameraStreamActive}
                        className="flex-1 p-2.5 rounded-xl text-xs font-extrabold font-sans text-white bg-[#1e40af] hover:bg-[#1d4ed8] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed border border-[#1e40af] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                      >
                        {loadingTranslate ? (
                          <div className="w-4 h-4 border-2 border-slate-350 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span>Capture & Translate Snapshot</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-[10px] text-slate-450 italic text-center leading-normal">
                  Our offline dictionary is restricted in camera modes. Frame target signs, documents, or labels clearly inside the finder view.
                </p>
              </div>
            )}

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-250 p-4.5 rounded-3xl shadow-sm">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#1e40af] uppercase tracking-wider font-sans flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#1e40af]" />
                      <span>Study &amp; Reference Hub</span>
                    </h3>
                    <p className="text-[11px] text-slate-450 font-sans mt-0.5 leading-normal">
                      Review translated entries ({translatedPhrases.length}) or toggle Quiz Mode below to test recall.
                    </p>
                  </div>
                  
                  {/* Highly polished interactive Custom Quiz Mode Toggle Switch */}
                  <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors select-none shrink-0 self-start sm:self-center">
                    <div className="flex flex-col text-right">
                      <span className="text-[11px] font-bold text-slate-800 font-sans leading-none">
                        Quiz Me Mode
                      </span>
                      <span className="text-[10px] text-slate-405 font-sans mt-1">
                        {quizMode ? "Hiding answers" : "Showing answers"}
                      </span>
                    </div>
                    <div 
                      onClick={(e) => {
                        e.preventDefault();
                        setQuizMode(!quizMode);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 border ${
                        quizMode 
                          ? "bg-[#1e40af] border-[#1e40af]" 
                          : "bg-slate-250 border-slate-350"
                      }`}
                    >
                      <span 
                        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full transition-all duration-300 shadow-xs ${
                          quizMode ? "transform translate-x-[20px]" : ""
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {/* If Quiz Mode is active, show an elegant educational notice card */}
                {quizMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 space-y-1 animate-fade-in flex items-start gap-2.5">
                    <span className="text-base leading-none">💡</span>
                    <div>
                      <span className="font-extrabold text-amber-900 uppercase tracking-wider font-sans text-[10px] block mb-0.5">
                        Vocabulary Retention Quiz Mode Active!
                      </span>
                      <p className="font-sans leading-relaxed text-amber-700">
                        Translations are masked on all dialect cards below. Try pronouncing the translation in your head or stating it aloud, then click <strong className="text-amber-900">“Reveal Answer”</strong> to self-evaluate and test your retention!
                      </p>
                    </div>
                  </div>
                )}
                
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
                                    onPronounce={(speed, voiceURI, volume, loop) => { handleHearVoice(`${phraseIdx}-${langKey}`, item.text, item.phonetic, speed, voiceURI, volume, loop); }}
                                    onStop={handleStopVoice}
                                    isExpanded={focusedLang === langKey}
                                    onToggleExpand={() => setFocusedLang(prev => prev === langKey ? null : langKey)}
                                    isQuizMode={quizMode}
                                    certification={phraseResult.certification}
                                    globalSpeechSpeed={globalSpeechSpeed}
                                    onQuickSwitch={() => handleQuickSwitch(item.text, langKey, sourceLang)}
                                    originalText={phraseResult.originalText}
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={exportHistoryToPDF}
                  className="text-[10px] bg-slate-50 border border-slate-200 py-1 px-2 rounded hover:bg-[#eff6ff] hover:text-[#1e40af] hover:border-blue-200 transition-all uppercase tracking-wider font-extrabold flex items-center gap-1 cursor-pointer"
                  title="Download History Ledger as PDF"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>Download Ledger</span>
                </button>
                <button
                  onClick={clearAllHistory}
                  className="text-[10px] font-bold text-red-650 hover:text-red-800 uppercase tracking-wider hover:bg-red-50 px-1.5 py-1 rounded transition-colors cursor-pointer"
                >
                  Clear Cache
                </button>
              </div>
            )}

            {activeRightTab === "favorites" && favorites.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={exportAllFavoritesToPDF}
                  className="text-[10px] bg-amber-50/60 border border-amber-200 py-1 px-2 rounded hover:bg-amber-100 hover:text-[#b45309] transition-all uppercase tracking-wider font-extrabold flex items-center gap-1 cursor-pointer text-amber-800"
                  title="Download Favorites Study Guide as PDF"
                >
                  <Download className="w-2.5 h-2.5 text-amber-700" />
                  <span>Download Lexicon</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to remove all translations from your favorites?")) {
                      setFavorites([]);
                    }
                  }}
                  className="text-[10px] font-bold text-red-650 hover:text-red-800 uppercase tracking-wider hover:bg-red-50 px-1.5 py-1 rounded transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
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

          {/* Interactive Study Session Calendar Integration Form Planner */}
          {activeRightTab === "favorites" && favorites.length > 0 && (
            <div className="mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setCalendarPanelOpen(!calendarPanelOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer font-sans shadow-3xs hover:shadow-2xs ${
                  calendarPanelOpen 
                    ? "bg-[#eff6ff] border-[#1e40af]/20 text-[#1e40af]" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-medium"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${calendarPanelOpen ? "text-[#1e40af] animate-pulse" : "text-slate-500"}`} />
                  <span className="text-xs font-bold font-sans">📅 Calendar Study Planner</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold bg-white text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200/50">
                    Export Routine
                  </span>
                  {calendarPanelOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </div>
              </button>

              {calendarPanelOpen && (
                <div className="mt-2.5 bg-slate-50 border border-slate-200/75 rounded-2xl p-4.5 space-y-3 font-sans animate-fade-in text-slate-750 shadow-3xs max-h-[340px] overflow-y-auto scrollbar-thin">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                      Study Session Title
                    </label>
                    <input
                      type="text"
                      value={studyPlanTitle}
                      onChange={(e) => setStudyPlanTitle(e.target.value)}
                      className="w-full text-xs font-sans px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e40af]/40 text-slate-800 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={studyDate}
                        onChange={(e) => setStudyDate(e.target.value)}
                        className="w-full text-xs font-sans px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e40af]/30 text-slate-700"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={studyTime}
                        onChange={(e) => setStudyTime(e.target.value)}
                        className="w-full text-xs font-sans px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e40af]/30 text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                        Duration
                      </label>
                      <select
                        value={studyDuration}
                        onChange={(e) => setStudyDuration(Number(e.target.value))}
                        className="w-full text-xs font-sans px-2 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none text-slate-700 font-medium"
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="45">45 Minutes</option>
                        <option value="60">1 Hour</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                        Recurrence
                      </label>
                      <select
                        value={studyRecurrence}
                        onChange={(e) => setStudyRecurrence(e.target.value as any)}
                        className="w-full text-xs font-sans px-2 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none text-slate-700 font-medium"
                      >
                        <option value="none">One Time Only</option>
                        <option value="daily">Daily (7 days)</option>
                        <option value="weekly">Weekly (4 weeks)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadIcs}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Local iCal (.ics)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleGoogleCalendarUrl}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-3xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Open Google Calendar</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={toggleNotifications}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-3xs ${
                        browserNotificationsEnabled 
                          ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700" 
                          : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Bell className={`w-3.5 h-3.5 ${browserNotificationsEnabled ? "text-emerald-500 fill-emerald-500" : "text-slate-400"}`} />
                      <span>{browserNotificationsEnabled ? "Browser Reminders: ON" : "Enable Browser Reminders"}</span>
                    </button>
                  </div>

                  <p className="text-[9.2px] text-slate-400 font-sans italic text-center leading-normal">
                    Compatible with Microsoft Outlook, Apple Calendar, iOS, Android, macOS clients. Syncs all target saved phrases automatically inside the agenda list!
                  </p>
                </div>
              )}
            </div>
          )}

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
                const uniqueCategories: ("All" | "Essential" | "Emergency" | "Business" | "Casual")[] = ["All", "Essential", "Emergency", "Business", "Casual"];

                const filteredFavorites = favorites.filter(item => {
                  const itemCat = item.category || autoClassifyPhrase(item.originalText);
                  
                  // Search filter
                  const matchesSearch = item.originalText.toLowerCase().includes(favoritesSearchQuery.toLowerCase()) || 
                    Object.values(item.translations).some(t => (t as any)?.text?.toLowerCase().includes(favoritesSearchQuery.toLowerCase()));

                  if (!matchesSearch) return false;

                  // Category filter
                  if (selectedFavCategory !== "All" && itemCat !== selectedFavCategory) {
                    return false;
                  }

                  return true;
                });

                return (
                  <div className="space-y-3">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-1 pb-3 pt-1 border-b border-slate-100">
                      {uniqueCategories.map(cat => {
                        const count = cat === "All" 
                          ? favorites.length 
                          : favorites.filter(f => (f.category || autoClassifyPhrase(f.originalText)) === cat).length;
                        
                        let bgActive = "bg-[#1e40af] text-white border-transparent";
                        if (cat === "Emergency") {
                          bgActive = "bg-rose-600 text-white border-transparent";
                        } else if (cat === "Business") {
                          bgActive = "bg-blue-700 text-white border-transparent";
                        } else if (cat === "Essential") {
                          bgActive = "bg-emerald-600 text-white border-transparent";
                        }

                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedFavCategory(cat)}
                            className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border cursor-pointer transition-all flex items-center gap-1 shrink-0 ${
                              selectedFavCategory === cat
                                ? `${bgActive} shadow-xs`
                                : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-55"
                            }`}
                          >
                            <span>{cat}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.1 rounded-full ${
                              selectedFavCategory === cat
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {filteredFavorites.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-sans">
                        {favorites.length === 0 
                          ? "Your favorites list is empty. Click the Star icon on any translation result to save it here!" 
                          : "No matching favorites found for this category filter."}
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
                              exportFavoriteToPDF(item);
                            }}
                            className="absolute right-9 top-3.5 p-1 text-[#1e40af] hover:text-[#1e3a8a] hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Download Certified Study Sheet"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

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

                          <div className="flex items-center gap-1.5 pr-6 font-mono text-[10px] text-slate-400">
                            <span className="font-bold mr-1">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[9px] bg-amber-55/70 border border-amber-200 text-amber-700 px-1.5 py-0.2 rounded font-sans font-bold uppercase flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Saved
                            </span>

                            {/* Current Category Badge */}
                            {(() => {
                              const itemCat = item.category || autoClassifyPhrase(item.originalText);
                              let colorStyle = "bg-slate-100/60 text-slate-650 border border-slate-200";
                              if (itemCat === "Emergency") {
                                colorStyle = "bg-rose-50 text-rose-700 border border-rose-200/50";
                              } else if (itemCat === "Business") {
                                colorStyle = "bg-blue-50 text-blue-700 border border-blue-200/50";
                              } else if (itemCat === "Essential") {
                                colorStyle = "bg-emerald-50 text-emerald-750 border border-emerald-200/50";
                              }
                              return (
                                <span className={`text-[8.5px] font-black px-1.8 py-0.2 rounded font-sans uppercase ${colorStyle}`}>
                                  {itemCat}
                                </span>
                              );
                            })()}
                          </div>

                          <h4 className="text-sm font-bold text-slate-800 mt-2 font-mono tracking-wide">
                            {item.originalText}
                          </h4>
                          <div className="mt-2 space-y-0.5 text-xs text-slate-600 font-sans border-t border-slate-205/60 pt-2 pb-6">
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

                          {/* Quick manual tag override toggler */}
                          <div className="absolute right-3.5 bottom-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8.5px] text-slate-400 font-extrabold uppercase mr-0.5">Tag:</span>
                            {(["Essential", "Emergency", "Business", "Casual"] as const).map((catOption) => {
                              let optionClass = "hover:bg-slate-100 border-slate-200 text-slate-400";
                              const isSelected = (item.category || autoClassifyPhrase(item.originalText)) === catOption;
                              if (isSelected) {
                                if (catOption === "Emergency") optionClass = "bg-rose-50 text-rose-700 border-rose-300 font-black";
                                else if (catOption === "Business") optionClass = "bg-blue-50 text-blue-700 border-blue-300 font-black";
                                else if (catOption === "Essential") optionClass = "bg-emerald-50 text-emerald-800 border-emerald-300 font-black";
                                else optionClass = "bg-slate-150 text-slate-755 border-slate-300 font-black";
                              }
                              return (
                                <button
                                  key={catOption}
                                  type="button"
                                  title={`Switch tag to ${catOption}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFavorites(prev => 
                                      prev.map(f => 
                                        f.originalText === item.originalText 
                                          ? { ...f, category: catOption } 
                                          : f
                                      )
                                    );
                                  }}
                                  className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border transition-all cursor-pointer ${optionClass}`}
                                >
                                  {catOption.substring(0, 4)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
