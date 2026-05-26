import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Copy, Check, Info, Maximize2, Minimize2, Eye, EyeOff, HelpCircle, Lightbulb, AlertTriangle, GraduationCap, ChevronDown, ChevronUp, Compass, ArrowLeftRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { TranslationDetail, SupportedLanguage, LANGUAGE_LABELS } from "../types";
import { getAvailableVoicesForLang } from "../utils/audio";

const LANGUAGE_LEARNING_TIPS: Record<
  SupportedLanguage,
  {
    culturalNuance: string;
    commonPitfall: string;
    proTip: string;
    difficultyLevel: "Beginner" | "Intermediate" | "Advanced";
  }
> = {
  am: {
    culturalNuance: "Addressing someone correctly based on relationship status is vital. Use 'Irswo' (እርስዎ) as an honorific for elders or professionals to show proper respect. Respectful handshakes using the right hand (often supported by the left) are standard.",
    commonPitfall: "Avoid confusing masculine ('ante') and feminine ('anchi') singular pronouns. Also, Amharic has distinct ejective consonants like 'Qe' (ቅ) and 'T\'e' (ጥ) that require sudden pressure release, which non-native speakers often overlook.",
    proTip: "Try organizing Ge'ez fidels in vowel families of seven (called orders) to easily recognize vowel sounds rather than treating letters as completely random.",
    difficultyLevel: "Intermediate"
  },
  en: {
    culturalNuance: "Indirect politeness and extensive use of words like 'Please,' 'Thank you,' and 'Excuse me' are socially expected. Expressing direct disagreement is usually cushioned with phrases like 'I see what you mean, but...'",
    commonPitfall: "Watch out for non-phonetic spellings! Words like 'colonel,' 'receipt,' or words with '-ough' (though, through, tough) defy standard reading rules.",
    proTip: "Immerse yourself in conversational 'phrasal verbs' (e.g., 'get along', 'give up') in context, as they make up a massive portion of casual speech.",
    difficultyLevel: "Beginner"
  },
  om: {
    culturalNuance: "Traditional Oromo culture places incredible value on thorough, warm greetings. Inquiring thoroughly about peace, family, well-being, and livestock ('Nagaya?') is key to proper social respect.",
    commonPitfall: "Vowel duration changes meanings entirely. For example, 'hara' (lake) has a single vowel sound while 'haaraa' (new) is drawn out. Avoid rushing double vowel spelling configurations.",
    proTip: "Train your ears to notice gemination (doubled consonants like 'bb', 'dd'). The slight pause before releasing geminated sounds is vital for speech clarity.",
    difficultyLevel: "Intermediate"
  },
  ti: {
    culturalNuance: "Maintaining continuous direct eye contact with elders or figures of high social status during a serious chat can be perceived as confrontational or rude. A slight nod and deferent posture is custom.",
    commonPitfall: "Tigrinya verbs are incredibly conjugation-heavy. Overlooking masculine/feminine suffix shifts for the second person singular is an extremely frequent trap for new learners.",
    proTip: "Mastering the Ge'ez script is very helpful here too! Pay attention to the deep pharyngeal sounds (such as 'Hha' or 'Ayn) to avoid sounding unnatural.",
    difficultyLevel: "Intermediate"
  },
  so: {
    culturalNuance: "Somali culture is rich in oral literature and poetry. Using proverbs ('maahmaahyo') gracefully in a conversation will instantly win huge respect and mark you as a sophisticated speaker.",
    commonPitfall: "Mispronouncing pharyngeal consonants 'x' (voiceless, like blowing warm air deep in the throat) and 'c' (voiced Arabic 'ayn sound) as standard English 'h' or 'a' levels.",
    proTip: "Practice correct pitch accent shifts! A subtle shift in pitch can transform word meanings, such as defining grammatical gender or distinct nouns.",
    difficultyLevel: "Intermediate"
  },
  zh: {
    culturalNuance: "Concept of saving/giving 'Face' (mianzi) guides most social networks. Instead of saying a flat 'No' which is seen as blunt/impolite, use delicate expressions like 'That's a bit difficult' or 'I will think about it.'",
    commonPitfall: "Pronouncing characters with incorrect tone pitches. Saying 'mā' (high level flat tone) means 'mother,' whereas 'mǎ' (low dipping/rising tone) means 'horse.'",
    proTip: "During early stages, speak with exaggerated pitch movements. It helps construct a strong neuro-muscular map for tonal pronunciation.",
    difficultyLevel: "Advanced"
  },
  fr: {
    culturalNuance: "Always greet shopkeepers, waiters, and associates with a polite 'Bonjour' before asking a question. Always respect 'Vous' (formal) until a local explicitly invites you to use 'Tu' (tutoyer).",
    commonPitfall: "Watch out for silent final letters (e.g., the final 's' in 'amis', or final 'ent' in third-person plural verbs like 'mangent') and the sound distinctions in nasal vowels ('un', 'on', 'in').",
    proTip: "Learn liaison rules where passive consonant endings bind to the next word starting with a vowel (e.g., 'les' + 'enfants' becomes /lay-zanfan/).",
    difficultyLevel: "Beginner"
  },
  ar: {
    culturalNuance: "Arabic conversation is richly layered with hospitable blessings and religious invocations ('Inshallah' - God willing, 'Alhamdulillah' - Praise be to God) used regularly across all religious groups.",
    commonPitfall: "Struggling with right-to-left optical orientation. Also, overlooking short vowel markings (harakat) which are entirely missing from common adult publications and news items.",
    proTip: "Focus heavily on the Root-And-Pattern structural matrix. Nearly all words are constructed from 3-consonant roots, making vocabulary extrapolation intuitive.",
    difficultyLevel: "Advanced"
  },
  es: {
    culturalNuance: "Social etiquette expects warm, physical greetings (double cheek kisses or firm hugs is normal). Embracing casual interruptions as a register of enthusiastic engagement rather than rudeness.",
    commonPitfall: "Tripping over false cognates (false friends). For instance, 'embarazada' means pregnant (not embarrassed) and 'introducir' means to insert (not to introduce a person).",
    proTip: "Form a habit of spelling out nouns complete with their singular articles ('el mapa', 'la mano') to naturally memorize grammatical genders that defy default pattern rules.",
    difficultyLevel: "Beginner"
  }
};

interface LanguageCardProps {
  key?: string;
  langKey: SupportedLanguage;
  translation: TranslationDetail;
  isPlaying: boolean;
  loadingTts: boolean;
  onPronounce: (speed: number, voiceURI?: string, volume?: number, loop?: boolean) => void;
  onStop: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isQuizMode?: boolean;
  certification?: {
    certId: string;
    stampText: string;
    date: string;
    signature: string;
    firmName: string;
  };
  globalSpeechSpeed?: number;
  onQuickSwitch?: () => void;
  originalText?: string;
}

export default function LanguageCard({
  langKey,
  translation,
  isPlaying,
  loadingTts,
  onPronounce,
  onStop,
  isExpanded,
  onToggleExpand,
  isQuizMode = false,
  certification,
  globalSpeechSpeed = 1.0,
  onQuickSwitch,
  originalText
}: LanguageCardProps) {
  const [copied, setCopied] = useState(false);
  const [displayScript, setDisplayScript] = useState<"native" | "phonetic" | "side-by-side">("native");

  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [inaccuracyCategory, setInaccuracyCategory] = useState("meaning");
  const [userComment, setUserComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    try {
      const persistedVote = localStorage.getItem(`rate:${langKey}:${translation.text}`);
      if (persistedVote === "up" || persistedVote === "down") {
        setUserVote(persistedVote);
      } else {
        setUserVote(null);
      }
      setFeedbackSubmitted(false);
      setShowReportForm(false);
      setUserComment("");
      setInaccuracyCategory("meaning");
    } catch (e) {
      console.warn("Storage rating load failed:", e);
    }
  }, [langKey, translation.text]);

  const logFeedbackItem = (ratingVal: "up" | "down", catKey?: string, commentVal?: string) => {
    try {
      const existingLogsRaw = localStorage.getItem("habeshalingua_feedback_log");
      const logs = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
      
      const cleanedLogs = logs.filter((item: any) => !(item.langKey === langKey && item.translatedText === translation.text));

      const newLog = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        langKey,
        originalText: originalText || "Custom Manual Input",
        translatedText: translation.text,
        phonetic: translation.phonetic || "",
        rating: ratingVal,
        issueCategory: ratingVal === "down" ? (catKey || "other") : undefined,
        userComment: ratingVal === "down" ? (commentVal || "") : undefined
      };

      const updatedLogs = [newLog, ...cleanedLogs];
      localStorage.setItem("habeshalingua_feedback_log", JSON.stringify(updatedLogs));
      localStorage.setItem(`rate:${langKey}:${translation.text}`, ratingVal);
      
      window.dispatchEvent(new Event("storage_feedback_updated"));
    } catch (err) {
      console.error("Failed to log translation feedback to LocalStorage:", err);
    }
  };

  const handleFeedbackClick = (ratingType: "up" | "down") => {
    if (ratingType === "up") {
      setUserVote("up");
      setShowReportForm(false);
      setFeedbackSubmitted(true);
      logFeedbackItem("up");
    } else {
      setUserVote("down");
      setShowReportForm(true);
      setFeedbackSubmitted(false);
    }
  };

  const handleSubmitReport = () => {
    logFeedbackItem("down", inaccuracyCategory, userComment);
    setShowReportForm(false);
    setFeedbackSubmitted(true);
  };
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(globalSpeechSpeed);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const metadata = LANGUAGE_LABELS[langKey];

  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    try {
      const localVal = localStorage.getItem("habeshalingua_autoplay_pronunciation");
      return localVal === "true";
    } catch (e) {
      return false;
    }
  });

  const toggleAutoPlay = () => {
    const newVal = !autoPlay;
    setAutoPlay(newVal);
    try {
      localStorage.setItem("habeshalingua_autoplay_pronunciation", newVal ? "true" : "false");
    } catch (e) {
      console.error("Failed to persist autoplay setting:", e);
    }
  };

  const [volume, setVolume] = useState<number>(() => {
    try {
      const persisted = localStorage.getItem("habeshalingua_audio_volume");
      return persisted !== null ? parseFloat(persisted) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const [isLooping, setIsLooping] = useState<boolean>(() => {
    try {
      const persisted = localStorage.getItem("habeshalingua_audio_looping");
      return persisted === "true";
    } catch {
      return false;
    }
  });

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    try {
      localStorage.setItem("habeshalingua_audio_volume", String(newVol));
    } catch (e) {
      console.error("Failed to persist volume setting:", e);
    }
  };

  const toggleLooping = () => {
    const newVal = !isLooping;
    setIsLooping(newVal);
    try {
      localStorage.setItem("habeshalingua_audio_looping", newVal ? "true" : "false");
    } catch (e) {
      console.error("Failed to persist looping setting:", e);
    }
  };

  const lastPlayedRef = useRef<string | null>(null);

  // Auto-play the audio when translation or active target language changes
  useEffect(() => {
    if (autoPlay && translation.text && !isQuizMode && !loadingTts && !isPlaying) {
      const cacheKey = `${langKey}:${translation.text}`;
      if (lastPlayedRef.current !== cacheKey) {
        lastPlayedRef.current = cacheKey;
        const timer = setTimeout(() => {
          onPronounce(playbackSpeed, selectedVoiceURI, volume, isLooping);
        }, 400);
        return () => clearTimeout(timer);
      }
    } else if (!autoPlay) {
      lastPlayedRef.current = null;
    }
  }, [translation.text, langKey, autoPlay, isQuizMode, onPronounce, playbackSpeed, selectedVoiceURI, loadingTts, isPlaying, volume, isLooping]);

  useEffect(() => {
    if (globalSpeechSpeed !== undefined) {
      setPlaybackSpeed(globalSpeechSpeed);
    }
  }, [globalSpeechSpeed]);

  useEffect(() => {
    setIsRevealed(false);
  }, [translation.text, isQuizMode]);

  useEffect(() => {
    const voiceLang = langKey === "zh" ? "zh-CN" : "en-US";
    const updateVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const voicesList = getAvailableVoicesForLang(voiceLang);
        setAvailableVoices(voicesList);
        if (voicesList.length > 0) {
          setSelectedVoiceURI(prev => {
            if (voicesList.some(v => v.voiceURI === prev)) return prev;
            return voicesList[0].voiceURI;
          });
        }
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      }
    };
  }, [langKey]);

  const handleCopy = async () => {
    try {
      const textToCopy = displayScript === "native" 
        ? translation.text 
        : displayScript === "phonetic"
        ? translation.phonetic
        : `${translation.text} /${translation.phonetic}/`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy transcript:", err);
    }
  };

  return (
    <div className={`border rounded-2xl p-5 bg-white transition-all duration-300 shadow-sm relative ${
      isPlaying 
        ? "border-[#1e40af] bg-[#eff6ff]/35 border-l-4 ring-4 ring-[#1e40af]/5" 
        : "border-[#e2e8f0] hover:border-slate-355"
    } ${
      isExpanded 
        ? "ring-4 ring-slate-100 border-[#1e40af]/30 shadow-md p-6 sm:p-8" 
        : ""
    }`}>
      {/* Flag Indicator in the Top Right Corner */}
      {metadata?.flag && (
        <div 
          className={`absolute flex items-center gap-1.5 bg-slate-50 border border-slate-200/50 rounded-full px-2 py-0.5 text-xs select-none shadow-2xs z-10 transition-all ${
            isExpanded ? "top-6 right-6" : "top-4 right-4"
          }`}
          title={`${metadata.label} (${langKey.toUpperCase()}) Flag`}
        >
          <span className="text-sm leading-none">{metadata.flag}</span>
          <span className="text-[9px] font-black text-slate-500 font-sans tracking-wide uppercase">{langKey}</span>
        </div>
      )}

      {/* Script status badge & standard label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className={`space-y-0.5 ${isExpanded ? "pr-16" : "pr-14"} sm:pr-0`}>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
            {metadata?.label || langKey}
          </span>
          <span className="block text-[10px] text-slate-400 font-sans">
            {metadata?.details}
          </span>
        </div>
        
        <div className={`flex items-center gap-1.5 flex-wrap ${isExpanded ? "sm:mr-16" : "sm:mr-14"}`}>
          {/* Script Segmented Control Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            <button
              onClick={() => setDisplayScript("native")}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                displayScript === "native"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Show native script"
            >
              Native
            </button>
            <button
              onClick={() => setDisplayScript("phonetic")}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                displayScript === "phonetic"
                  ? "bg-white text-[#1e40af] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Show phonetic romanization"
            >
              Phonetic
            </button>
            <button
              onClick={() => setDisplayScript("side-by-side")}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                displayScript === "side-by-side"
                  ? "bg-white text-emerald-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Show side-by-side comparison"
            >
              Side-by-side
            </button>
          </div>

          {/* Copy translation output */}
          <button
            onClick={handleCopy}
            className="p-1 px-2.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            title={displayScript === "native" ? "Copy native text" : displayScript === "phonetic" ? "Copy phonetic text" : "Copy both text and phonetic"}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#1e40af] font-bold" />
                <span className="text-[#1e40af] font-bold font-sans">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans">Copy</span>
              </>
            )}
          </button>

          {/* Quick-Switch swap button */}
          {onQuickSwitch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickSwitch();
              }}
              className="p-1 px-2.5 rounded-lg text-xs text-[#1e40af] bg-blue-50/50 hover:bg-[#1e40af]/10 border border-blue-100 flex items-center gap-1 transition-all cursor-pointer font-medium"
              title="Quick Swap: Make this the source language"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#1e40af]" />
              <span className="font-sans">Swap</span>
            </button>
          )}

          {/* Expand/Collapse Focus Toggle Button */}
          <button
            onClick={onToggleExpand}
            className={`p-1 px-2.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer border ${
              isExpanded 
                ? "bg-[#eff6ff] text-[#1e40af] border-[#1e40af]/20 hover:bg-[#eff6ff]/80 font-bold"
                : "text-slate-500 hover:text-slate-850 hover:bg-slate-100 border-transparent font-medium"
            }`}
            title={isExpanded ? "Exit focus mode" : "Focus on this language"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="font-sans">Exit Focus</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="font-sans">Focus</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main translation result text layout or Quiz Mask */}
      {isQuizMode && !isRevealed ? (
        <div className="my-5 p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center gap-3 animate-fade-in relative overflow-hidden min-h-[140px] shadow-inner">
          <div className="absolute right-3.5 top-3.5">
            <HelpCircle className="w-5 h-5 text-slate-300 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] bg-amber-105 border border-amber-200 text-amber-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest font-sans">
              Vocabulary Quiz
            </span>
            <p className="text-xs text-slate-500 font-sans font-medium max-w-[200px] leading-relaxed">
              How do you say this in <span className="font-bold text-slate-700">{metadata?.label || langKey}</span>?
            </p>
          </div>
          <button
            onClick={() => setIsRevealed(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1e40af] hover:bg-[#1d4ed8] text-white active:scale-95 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reveal Answer</span>
          </button>
        </div>
      ) : (
        <>
          {/* Structural Layout and Render Blocks based on file format structure */}
          <div className="my-3 space-y-4">
            {translation.tableData ? (
              /* Table Layout Formatting */
              <div className="my-4 overflow-hidden rounded-xl border border-slate-200 shadow-3xs bg-white animate-fade-in">
                <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1e40af] flex items-center gap-1.5 font-sans">
                    <span className="w-1.5 h-1.5 bg-[#1e40af] rounded-full animate-pulse"></span>
                    Legal Matrix Structure (Table Mode)
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold font-sans">Formally Formatted</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left font-sans text-xs">
                    <thead className="bg-[#1e40af]/5 text-slate-700 font-bold">
                      <tr>
                        {translation.tableData.headers?.map((header, idx) => (
                          <th key={idx} className="px-4 py-3 text-xs font-black tracking-tight text-[#1e40af]">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white text-slate-650">
                      {translation.tableData.rows?.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-2.5 border-r border-slate-100 last:border-r-0 font-medium whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : translation.formData ? (
              /* Labeled Registration/Form Layout Formatting */
              <div className="my-4 p-4 rounded-xl border border-slate-200 bg-stone-50/50 space-y-3 animate-fade-in font-sans">
                <div className="border-b border-slate-200/60 pb-2 mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                    Registrations & Labeled Forms Layout
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">Formal Key Value</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                  {translation.formData.map((field, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-150 rounded-lg shadow-3xs flex flex-col gap-1 hover:border-indigo-200 transition-colors">
                      <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-widest leading-none">
                        {field.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900 pr-1 truncate" title={field.value}>
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : translation.documentData ? (
              /* Administrative legal continuous document layout */
              <div className="my-4 p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-3xs space-y-4 font-serif text-slate-800 relative animate-fade-in leading-relaxed">
                <div className="absolute right-4 top-3 text-[9px] font-black uppercase text-amber-700 tracking-wider bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-sans">
                  Official Legal Doc Format
                </div>
                {translation.documentData.title && (
                  <h4 className="text-base sm:text-lg font-black text-slate-900 border-b border-dashed border-slate-200 pb-2.5 tracking-tight text-center font-sans">
                    {translation.documentData.title}
                  </h4>
                )}
                <div className="space-y-4 text-xs sm:text-sm">
                  {translation.documentData.sections?.map((sec, idx) => (
                    <div key={idx} className="space-y-1.5">
                      {sec.heading && (
                        <h5 className="font-extrabold text-[#1e40af] font-sans text-xs uppercase tracking-wider">
                          {sec.heading}
                        </h5>
                      )}
                      <p className="indent-4 leading-relaxed pr-1">{sec.paragraph}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Fallback to Standard Paragraph Text Formatting view */
              <div className={`text-slate-900 transition-all duration-300 leading-normal ${
                isExpanded 
                  ? "py-4 border-b border-dashed border-slate-100 mb-4" 
                  : ""
              }`}>
                {displayScript === "side-by-side" ? (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                    <span className={`text-xl font-bold tracking-tight ${
                      isExpanded ? "text-2xl sm:text-3xl md:text-3xl font-black" : ""
                    } ${langKey === "ti" ? "font-serif" : "font-sans"}`}>
                      {translation.text || "..."}
                    </span>
                    <span className={`italic text-slate-500 font-sans ${
                      isExpanded ? "text-xl sm:text-2xl font-bold" : "text-lg font-medium"
                    }`}>
                      /{translation.phonetic || "..."}/
                    </span>
                  </div>
                ) : (
                  <p className={`${
                    isExpanded ? "text-2xl sm:text-3xl md:text-3xl font-black" : "text-xl font-bold tracking-tight"
                  } ${
                    displayScript === "phonetic" 
                      ? "font-sans italic text-slate-800" 
                      : (langKey === "ti" ? "font-serif" : "font-sans")
                  }`}>
                    {displayScript === "native" ? (translation.text || "...") : (`/${translation.phonetic}/` || "...")}
                  </p>
                )}
              </div>
            )}

            {/* Pronunciation guide phonetic map for Standard layouts */}
            {translation.phonetic && displayScript !== "side-by-side" && !translation.tableData && !translation.formData && !translation.documentData && (
              <div className={`inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 transition-all ${
                isExpanded ? "scale-105 origin-left px-3.5 py-1.5" : ""
              }`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">
                  {displayScript === "native" ? "Phonetic:" : "Native:"}
                </span>
                <span className={`font-bold font-sans ${
                  isExpanded ? "text-sm sm:text-base text-[#1e40af]" : "text-xs text-slate-700"
                }`}>
                  {displayScript === "native" ? `/${translation.phonetic}/` : translation.text}
                </span>
              </div>
            )}
          </div>

          {/* Linguistic notes & contextual definitions */}
          {translation.notes && (
            <div className={`rounded-xl bg-slate-50 border border-slate-150 text-slate-605 font-sans flex items-start gap-2 transition-all ${
              isExpanded 
                ? "mt-5 p-4 text-xs sm:text-sm shadow-xs border-[#1e40af]/10" 
                : "mt-3.5 p-3 text-xs"
            }`}>
              <Info className="w-4 h-4 text-[#1e40af] shrink-0 mt-0.5" />
              <p className="leading-relaxed">{translation.notes}</p>
            </div>
          )}

          {/* Language Learning Tips & Cultural Guidance Section */}
          {(() => {
            const tips = LANGUAGE_LEARNING_TIPS[langKey];
            if (!tips) return null;
            return (
              <div className={`mt-4 rounded-xl border transition-all duration-350 ${
                tipsOpen 
                  ? "bg-[#faf9f6]/95 border-amber-300 shadow-xs" 
                  : "bg-slate-50 border-slate-200/70 hover:border-slate-350 hover:bg-slate-100/60"
              }`}>
                <button
                  type="button"
                  onClick={() => setTipsOpen(!tipsOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className={`w-4 h-4 ${tipsOpen ? "text-amber-500 fill-amber-100 animate-pulse" : "text-slate-400"}`} />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
                      {metadata?.label || langKey} Study Insights
                    </span>
                    <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${
                      tips.difficultyLevel === "Beginner" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-250/50" 
                        : tips.difficultyLevel === "Intermediate"
                        ? "bg-blue-50 text-blue-700 border border-blue-250/50"
                        : "bg-rose-50 text-rose-700 border border-rose-250/50"
                    }`}>
                      {tips.difficultyLevel}
                    </span>
                  </div>
                  {tipsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {tipsOpen && (
                  <div className="px-4 pb-4.5 pt-2 space-y-3.5 border-t border-dashed border-slate-200 text-xs text-slate-650 font-sans">
                    {/* Cultural Nuance */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider">
                        <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Cultural Nuance & Etiquette</span>
                      </div>
                      <p className="leading-relaxed pl-5 text-slate-600 text-[11.5px]">{tips.culturalNuance}</p>
                    </div>

                    {/* Common Pitfall */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-[10px] uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Common Learner Pitfall</span>
                      </div>
                      <p className="leading-relaxed pl-5 text-slate-600 text-[11.5px]">{tips.commonPitfall}</p>
                    </div>

                    {/* Pro Tip */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[#1e40af] font-extrabold text-[10px] uppercase tracking-wider">
                        <GraduationCap className="w-3.5 h-3.5 text-[#1e45af] shrink-0" />
                        <span>Accelerated Study Tip</span>
                      </div>
                      <p className="leading-relaxed pl-5 text-slate-600 italic text-[11.5px]">"{tips.proTip}"</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Licensed legal translator firm Certified seal */}
          {certification && (
            <div className="mt-4 p-4 border-2 border-dashed border-amber-300 relative bg-amber-50/20 rounded-2xl animate-fade-in font-sans">
              <div className="absolute right-4.5 top-4 text-amber-600 select-none opacity-85">
                <svg className="w-14 h-14" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <ellipse cx="50" cy="50" rx="30" ry="10" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(-30 50 50)"/>
                  <ellipse cx="50" cy="50" rx="10" ry="30" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(-30 50 50)"/>
                  <text x="50" y="45" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="currentColor">SWORN</text>
                  <text x="50" y="53" textAnchor="middle" fontSize="5" fontWeight="black" fill="currentColor">TRANSLATOR</text>
                  <text x="50" y="60" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="currentColor">SEAL</text>
                </svg>
              </div>

              <div className="space-y-2.5 max-w-[80%]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-amber-600 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    ⚖️ Certified Translation
                  </span>
                  <span className="text-[10px] text-slate-505 font-mono font-bold tracking-wider">
                    ID: {certification.certId}
                  </span>
                </div>

                <p className="text-[11px] font-medium leading-relaxed text-slate-700 italic">
                  "{certification.stampText}"
                </p>

                <div className="pt-2 border-t border-slate-200/50 flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] text-slate-500 font-sans">
                  <div>
                    <span className="font-bold text-slate-400">Notary Witness Fee Firm:</span>{" "}
                    <span className="font-extrabold text-slate-700">{certification.firmName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Certified Sworn Date:</span>{" "}
                    <span className="font-extrabold text-slate-700">{certification.date}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Licensed Translator:</span>{" "}
                    <span className="font-extrabold text-slate-700">{certification.signature}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-2 border-t border-slate-250/30 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      const printContent = `
                        <html>
                          <head>
                            <title>Certified Legal Translation - ${certification.certId}</title>
                            <style>
                              body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; line-height: 1.6; }
                              .certificate { border: 6px double #d97706; padding: 40px; max-width: 800px; margin: 0 auto; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                              .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
                              .header h1 { font-size: 24px; margin: 0; text-transform: uppercase; color: #1e40af; letter-spacing: 1px; }
                              .header p { font-size: 11px; margin: 5px 0 0 0; color: #666; font-family: sans-serif; text-transform: uppercase; letter-spacing: 2px; }
                              .certified-badge { float: right; border: 2px dashed #d97706; padding: 10px; font-weight: bold; font-family: sans-serif; font-size: 10px; color: #d97706; border-radius: 4px; }
                              .section-title { font-size: 12px; font-weight: bold; color: #1e40af; text-transform: uppercase; font-family: sans-serif; margin-top: 25px; margin-bottom: 5px; letter-spacing: 1px; }
                              .content-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-family: sans-serif; font-size: 12px; }
                              .content-table th { background: #eff6ff; color: #1e40af; border: 1px solid #ddd; padding: 8px; font-weight: bold; }
                              .content-table td { border: 1px solid #ddd; padding: 8px; }
                              .content-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; font-family: sans-serif; font-size: 12px; }
                              .content-form-item { border: 1px solid #eee; padding: 10px; border-radius: 4px; background: #fafafa; }
                              .content-form-item span { font-size: 9px; text-transform: uppercase; color: #1e40af; display: block; font-weight: bold; }
                              .content-doc { padding: 20px; background: #faf8f5; border: 1px solid #e5e5e0; margin: 15px 0; border-radius: 4px; }
                              .content-doc-title { text-align: center; margin-top: 0; font-weight: bold; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
                              .content-plain { font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
                              .seal-container { margin-top: 40px; border-t: 1px solid #ccc; padding-top: 25px; font-size: 11px; font-family: sans-serif; color: #444; }
                              .seal-svg { float: right; width: 100px; height: 100px; margin-top: -20px; }
                              @media print {
                                body { padding: 0; }
                                .certificate { box-shadow: none; border-color: #000; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="certificate">
                              <div class="certified-badge">CERTIFIED ACCURATE<br/>LICENSE: ${certification.certId}</div>
                              <div class="header">
                                <h1>Certificate of Legal Language Accuracy</h1>
                                <p>${certification.firmName}</p>
                              </div>
                              
                              <p style="font-size: 13px;">This certifies that the attached document translation has been carefully and faithfully reviewed, verified, and certified accurate of the original by a professional sworn East African Regional linguistic expert. It complies fully with international legal localization guidelines.</p>

                              <div class="section-title">TRANSLATED METRICS (${LANGUAGE_LABELS[langKey]?.label || langKey})</div>
                              
                              ${translation.tableData ? `
                                <table class="content-table">
                                  <thead>
                                    <tr>
                                      ${translation.tableData.headers?.map(h => `<th>${h}</th>`).join("")}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${translation.tableData.rows?.map(row => `
                                      <tr>
                                        ${row.map(cell => `<td>${cell}</td>`).join("")}
                                      </tr>
                                    `).join("")}
                                  </tbody>
                                </table>
                              ` : translation.formData ? `
                                <div class="content-form">
                                  ${translation.formData.map(f => `
                                    <div class="content-form-item">
                                      <span>${f.label}</span>
                                      <strong>${f.value}</strong>
                                    </div>
                                  `).join("")}
                                </div>
                              ` : translation.documentData ? `
                                <div class="content-doc">
                                  ${translation.documentData.title ? `<h3 class="content-doc-title">${translation.documentData.title}</h3>` : ""}
                                  ${translation.documentData.sections?.map(sec => `
                                    <div style="margin-bottom: 12px;">
                                      ${sec.heading ? `<h4 style="margin: 0 0 5px 0; color: #1e40af; font-family: sans-serif; font-size: 11px;">${sec.heading}</h4>` : ""}
                                      <p style="margin: 0; text-indent: 15px;">${sec.paragraph}</p>
                                    </div>
                                  `).join("")}
                                </div>
                              ` : `
                                <div class="content-plain">
                                  "${translation.text}"
                                </div>
                              `}

                              <div class="seal-container">
                                <svg class="seal-svg" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="45" fill="none" stroke="#d97706" stroke-width="2"/>
                                  <circle cx="50" cy="50" r="40" fill="none" stroke="#d97706" stroke-width="1"/>
                                  <text x="50" y="44" text-anchor="middle" font-size="6" font-weight="bold" fill="#d97706" font-family="sans-serif">CERTIFIED</text>
                                  <text x="50" y="52" text-anchor="middle" font-size="5" fill="#d97706" font-family="sans-serif">SWORN LOCALIZER</text>
                                  <text x="50" y="60" text-anchor="middle" font-size="6" font-weight="bold" fill="#d97706" font-family="sans-serif">OFFICIAL SEAL</text>
                                </svg>
                                <div style="width: 70%">
                                  <strong>Authorized Firm Signature:</strong> <span style="font-style: italic; font-family: serif; font-size: 14px; text-decoration: underline;">${certification.signature}</span><br/>
                                  <strong>Certification Register ID:</strong> ${certification.certId}<br/>
                                  <strong>Attestation Date:</strong> ${certification.date}<br/>
                                  <strong>Issuer Bureau:</strong> ${certification.firmName}
                                </div>
                              </div>
                            </div>
                            <script>window.onload = function() { window.print(); }</script>
                          </body>
                        </html>
                      `;
                      printWindow.document.open();
                      printWindow.document.write(printContent);
                      printWindow.document.close();
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] shadow-3xs"
                >
                  <span>Print Certified Document</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Toggle option to hide again */}
          {isQuizMode && isRevealed && (
            <div className="mt-2.5 flex justify-end animate-fade-in">
              <button
                onClick={() => setIsRevealed(false)}
                className="text-[10px] bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-500 hover:text-rose-600 font-bold rounded-lg px-2.5 py-1 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Answer</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Dynamic Translation Quality Feedback Panel */}
      <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-sans">
              Accuracy Rating
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFeedbackClick("up")}
              className={`p-1.5 px-2.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                userVote === "up"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold shadow-3xs"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
              title="This translation is correct"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${userVote === "up" ? "fill-emerald-100" : ""}`} />
              <span className="text-[10px]">{userVote === "up" ? "Verified" : "Helpful"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleFeedbackClick("down")}
              className={`p-1.5 px-2.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                userVote === "down"
                  ? "bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-3xs"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-rose-50"
              }`}
              title="Report an inaccuracy/bug in this translation"
            >
              <ThumbsDown className={`w-3.5 h-3.5 ${userVote === "down" ? "fill-rose-100" : ""}`} />
              <span className="text-[10px]">{userVote === "down" ? "Reported" : "Inaccurate"}</span>
            </button>
          </div>
        </div>

        {/* Slide-open inaccuracy feedback form details */}
        {userVote === "down" && showReportForm && (
          <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 space-y-2.5 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-rose-800 uppercase tracking-widest block">
                Select Issue Category
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: "meaning", label: "❌ Wrong Meaning" },
                  { key: "grammar", label: "✍️ Spelling/Grammar" },
                  { key: "pronounce", label: "🗣️ Pronunciation/Audio" },
                  { key: "other", label: "🤷 General Bug" }
                ].map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setInaccuracyCategory(cat.key)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border text-left cursor-pointer transition-all ${
                      inaccuracyCategory === cat.key
                        ? "bg-rose-100 text-rose-800 border-rose-300 pointer-events-none"
                        : "bg-white text-slate-650 border-slate-200/80 hover:bg-rose-50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-rose-800 uppercase tracking-widest block">
                Additional Comments & Corrections
              </label>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="Suggest correct text, spelling, or describe the error..."
                className="w-full text-xs p-2 rounded-lg bg-white border border-slate-205 focus:border-rose-400 outline-none font-sans min-h-[44px] resize-y"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmitReport}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
              >
                Log Inaccurate Translation
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReportForm(false);
                  setUserVote(null);
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-650 border border-slate-205 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Localized feedback toast message */}
        {feedbackSubmitted && (
          <div className="text-[10.5px] text-emerald-750 font-bold font-sans bg-emerald-50 border border-emerald-250 rounded-lg p-2.5 flex items-start gap-1.5 animate-fade-in">
            <span>✨</span>
            <span className="leading-tight">Thank you! Your feedback has been logged in "Preferences &gt; Issue Logs" to help train and perfect our regional dialects models.</span>
          </div>
        )}
      </div>

      {/* Real-time Voice Pronunciation speaker panel */}
      <div className={`pt-3.5 border-t border-slate-100 flex flex-col gap-3 transition-all ${
        isExpanded ? "mt-6" : "mt-4"
      }`}>
        {/* Speed & Custom System Voice controls */}
        <div className="flex flex-col gap-2.5 bg-slate-50 border border-slate-200/50 rounded-xl p-3 shadow-2xs">
          {/* Auto-Play Pronunciation Toggle */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 pb-2.5 select-none font-sans">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-[#1e40af] uppercase tracking-wider block">
                Auto-Play Audio 🔊
              </span>
              <span className="text-[9px] text-slate-450 block mt-0.5 leading-none">
                Automatically plays voice on phrase change
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAutoPlay}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoPlay ? "bg-[#1e40af]" : "bg-slate-200"
              }`}
              role="switch"
              aria-checked={autoPlay}
              title="Toggle Auto-Play Pronunciation"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  autoPlay ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Speed Control Slider (0.5x, 1x, 1.5x, 2x) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/40 pb-2.5">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">
              Speech Speed: <span className="text-[#1e40af] font-black">{playbackSpeed}x</span>
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.5"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="w-24 sm:w-28 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1e40af]"
                title="Adjust speech rate"
              />
              <div className="flex gap-1 text-[9px] text-slate-400 font-mono font-bold select-none">
                <span className={playbackSpeed === 0.5 ? "text-[#1e40af]" : ""}>0.5x</span>
                <span className={playbackSpeed === 1.0 ? "text-[#1e40af]" : ""}>1x</span>
                <span className={playbackSpeed === 1.5 ? "text-[#1e40af]" : ""}>1.5x</span>
                <span className={playbackSpeed === 2.0 ? "text-[#1e40af]" : ""}>2x</span>
              </div>
            </div>
          </div>

          {/* Volume Control Slider */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/40 pb-2.5">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">
              Audio Volume: <span className="text-[#1e40af] font-black">{Math.round(volume * 100)}%</span>
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-24 sm:w-28 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1e40af]"
                title="Adjust audio output volume"
              />
              <span className="text-[9px] text-slate-400 font-mono font-bold select-none w-8 text-right">
                {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
              </span>
            </div>
          </div>

          {/* Drill Loop Toggle */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 pb-2.5 select-none font-sans">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-[#1e40af] uppercase tracking-wider block">
                Continuous Drill Loop 🔄
              </span>
              <span className="text-[9px] text-slate-450 block mt-0.5 leading-none">
                Repeats audio infinitely for pronunciation drilling
              </span>
            </div>
            <button
              type="button"
              onClick={toggleLooping}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isLooping ? "bg-[#1e40af]" : "bg-slate-200"
              }`}
              role="switch"
              aria-checked={isLooping}
              title="Toggle Continuous Drill Loop"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isLooping ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Voice selector dropdown (only shown if matched voices are loaded) */}
          {availableVoices.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 md:gap-3">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-sans shrink-0">
                Speech Voice:
              </label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full sm:max-w-[200px] md:max-w-[240px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-sans text-slate-700 focus:border-[#1e40af] focus:ring-1 focus:ring-[#1e40af]/20 outline-none truncate cursor-pointer"
                title="Select preferred text-to-speech voice"
              >
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} {v.localService ? "☁️" : "🗣️"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3.5 w-7 text-[#1e40af]" title="Audio playing">
                <span className="w-1 bg-[#1e40af] rounded-sm animate-[bounce_0.8s_infinite_100ms] h-full"></span>
                <span className="w-1 bg-[#1e40af] rounded-sm animate-[bounce_0.8s_infinite_300ms] h-2/3"></span>
                <span className="w-1 bg-[#1e40af] rounded-sm animate-[bounce_0.8s_infinite_200ms] h-5/6"></span>
                <span className="w-1 bg-[#1e40af] rounded-sm animate-[bounce_0.8s_infinite_400ms] h-1/2"></span>
              </div>
            )}
            <span className={`text-slate-500 font-sans ${isExpanded ? "text-xs sm:text-sm" : "text-[11px]"}`}>
              {isPlaying ? "Playing voice file..." : "Listen to native accent"}
            </span>
          </div>

          {isPlaying ? (
            <button
              onClick={onStop}
              className={`rounded-xl font-semibold bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1.5 transition-colors font-sans border border-red-200 cursor-pointer ${
                isExpanded ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
              }`}
            >
              <VolumeX className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => onPronounce(playbackSpeed, selectedVoiceURI, volume, isLooping)}
              disabled={loadingTts || !translation.text}
              className={`rounded-xl font-semibold flex items-center gap-1.5 transition-all font-sans border cursor-pointer ${
                isExpanded ? "px-5 py-1.5 sm:py-2 text-sm" : "px-3 py-1.5 text-xs"
              } ${
                loadingTts
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-[#1e40af] text-white border-[#1e40af] hover:bg-[#1d4ed8]"
              }`}
            >
              {loadingTts ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-450 border-t-transparent animate-spin"></div>
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Hear Voice</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
