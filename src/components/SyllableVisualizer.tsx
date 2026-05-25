import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { playOfflineSpeech } from "../utils/audio";

interface SyllableVisualizerProps {
  syllables?: string[];
  originalText: string;
}

export default function SyllableVisualizer({ syllables = [], originalText }: SyllableVisualizerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tempo, setTempo] = useState<number>(600); // ms per syllable

  // Fallback if syllables list is not populated (e.g., offline mode or simpler inputs)
  const list = syllables && syllables.length > 0 
    ? syllables 
    : originalText.split("").filter(c => c.trim() !== "");

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      if (activeIndex === null || activeIndex >= list.length - 1) {
        setActiveIndex(0);
      } else {
        timer = setTimeout(() => {
          setActiveIndex(prev => {
            if (prev === null || prev >= list.length - 1) {
              setIsPlaying(false);
              return null;
            }
            return prev + 1;
          });
        }, tempo);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, activeIndex, list.length, tempo]);

  useEffect(() => {
    if (isPlaying && activeIndex !== null) {
      // Sound cue for syllable step (using a clean synth beep in the browser)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          // High pitch for clean rhythmic syllables guidance
          osc.frequency.setValueAtTime(350 + (activeIndex * 30), audioCtx.currentTime); 
          gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        }
      } catch (e) {
        // ignore audio cue if blocked
      }
    }
  }, [activeIndex, isPlaying]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setActiveIndex(0);
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    setActiveIndex(prev => {
      if (prev === null) return 0;
      return Math.min(list.length - 1, prev + 1);
    });
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setActiveIndex(prev => {
      if (prev === null) return 0;
      return Math.max(0, prev - 1);
    });
  };

  if (list.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 font-sans">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e40af] animate-pulse"></span>
            Real-Time Pronunciation Guide
          </h4>
          <p className="text-xs text-slate-500 font-sans">
            Syllable-by-syllable phonetics play-along trainer.
          </p>
        </div>
        
        {/* Speed slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-sans font-bold">Pace:</span>
          <input 
            type="range" 
            min="300" 
            max="1200" 
            step="100"
            value={tempo} 
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-24 accent-[#1e40af] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-slate-600 font-sans font-bold w-12 text-right">{tempo}ms</span>
        </div>
      </div>

      {/* Syllable bubble list */}
      <div className="flex flex-wrap items-center justify-center gap-2 my-5">
        {list.map((syllable, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              onClick={() => {
                setIsPlaying(false);
                setActiveIndex(index);
              }}
              className={`px-4.5 py-3 rounded-2xl font-sans text-lg font-extrabold border transition-all duration-200 shadow-sm relative cursor-pointer ${
                isActive 
                  ? "bg-[#1e40af] border-[#1e40af] text-white transform scale-105 shadow-md" 
                  : "bg-white border-slate-200 text-slate-700 hover:border-[#1e40af]/30 hover:bg-slate-50/50"
              }`}
            >
              {syllable}
              
              {/* Syllable order index tag */}
              <span className={`absolute -top-2 -right-1.5 text-[9px] px-1.5 py-0.2 rounded-md font-sans font-bold border ${
                isActive 
                  ? "bg-[#1e40af] text-white border-[#1e40af]" 
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rhythmic navigation controls */}
      <div className="flex items-center justify-center gap-4 bg-white py-2 px-4 rounded-2xl border border-slate-200/60 w-fit mx-auto shadow-xs">
        <button
          onClick={handlePrev}
          disabled={activeIndex === null || activeIndex === 0}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Previous Syllable"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handlePlayPause}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold font-sans border transition-all cursor-pointer shadow-xs ${
            isPlaying 
              ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600" 
              : "bg-[#1e40af] hover:bg-[#1d4ed8] text-white border-[#1e40af]"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Sound Out</span>
            </>
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={activeIndex === null || activeIndex === list.length - 1}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Next Syllable"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Selected sound focus status */}
      {activeIndex !== null && (
        <div className="mt-4 text-center text-xs text-slate-600 font-sans border-t border-slate-200/60 pt-3 animate-fade-in">
          Syllable {activeIndex + 1} of {list.length}: <strong className="text-sm font-sans text-slate-900 font-bold">"{list[activeIndex]}"</strong> 
          <span className="block mt-1 text-[11px] text-slate-500">
            Focus details: Use your lips and vocal cord mapping to match the {activeIndex + 1 === 1 ? "starting" : indexToLabel(activeIndex + 1)} sound wave shape.
          </span>
        </div>
      )}
    </div>
  );
}

function indexToLabel(index: number): string {
  if (index === 2) return "secondary";
  if (index === 3) return "tertiary";
  return `${index}th`;
}
