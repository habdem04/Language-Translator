import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Copy, Check, Info, Maximize2, Minimize2 } from "lucide-react";
import { TranslationDetail, SupportedLanguage, LANGUAGE_LABELS } from "../types";
import { getAvailableVoicesForLang } from "../utils/audio";

interface LanguageCardProps {
  key?: string;
  langKey: SupportedLanguage;
  translation: TranslationDetail;
  isPlaying: boolean;
  loadingTts: boolean;
  onPronounce: (speed: number, voiceURI?: string) => void;
  onStop: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function LanguageCard({
  langKey,
  translation,
  isPlaying,
  loadingTts,
  onPronounce,
  onStop,
  isExpanded,
  onToggleExpand
}: LanguageCardProps) {
  const [copied, setCopied] = useState(false);
  const [displayScript, setDisplayScript] = useState<"native" | "phonetic">("native");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const metadata = LANGUAGE_LABELS[langKey];

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
      const textToCopy = displayScript === "native" ? translation.text : translation.phonetic;
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
          </div>

          {/* Copy translation output */}
          <button
            onClick={handleCopy}
            className="p-1 px-2.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            title={displayScript === "native" ? "Copy native text" : "Copy phonetic text"}
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

      {/* Main translation result text layout */}
      <div className="my-3 space-y-2">
        <p className={`text-slate-900 transition-all duration-300 leading-normal ${
          isExpanded 
            ? "text-2xl sm:text-3xl md:text-4xl font-black py-4 border-b border-dashed border-slate-100 mb-4" 
            : "text-xl font-bold tracking-tight"
        } ${
          displayScript === "phonetic" 
            ? "font-sans italic text-slate-800" 
            : (langKey === "ti" ? "font-serif" : "font-sans")
        }`}>
          {displayScript === "native" ? (translation.text || "...") : (`/${translation.phonetic}/` || "...")}
        </p>

        {/* Pronunciation guide phonetic map */}
        {translation.phonetic && (
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

      {/* Real-time Voice Pronunciation speaker panel */}
      <div className={`pt-3.5 border-t border-slate-100 flex flex-col gap-3 transition-all ${
        isExpanded ? "mt-6" : "mt-4"
      }`}>
        {/* Speed & Custom System Voice controls */}
        <div className="flex flex-col gap-2.5 bg-slate-50 border border-slate-200/50 rounded-xl p-3 shadow-2xs">
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
              onClick={() => onPronounce(playbackSpeed, selectedVoiceURI)}
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
