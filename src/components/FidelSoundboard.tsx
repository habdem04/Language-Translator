import React, { useState } from "react";
import { Volume2, BookOpen, Search } from "lucide-react";

interface FidelGroup {
  family: string;
  characters: { letter: string; sound: string; description: string }[];
}

const FIDEL_DATA: FidelGroup[] = [
  {
    family: "H (Hale-me)",
    characters: [
      { letter: "ሀ", sound: "ha", description: "First consonant, soft H sound as in 'hat'" },
      { letter: "ሁ", sound: "hu", description: "H sound paired with short 'oo' vowel sound" },
      { letter: "ሂ", sound: "hi", description: "H sound paired with short 'ee' vowel sound" },
      { letter: "ሃ", sound: "ha", description: "Open H sound with long 'ah' vowel" },
      { letter: "ሄ", sound: "he", description: "H sound paired with 'eh' or 'ay' sound as in 'hey'" },
      { letter: "ህ", sound: "he' (or h)", description: "Breath consonant sound without final vowel" },
      { letter: "ሆ", sound: "ho", description: "Deep rounded 'ho' sound with long 'oh' vowel" }
    ]
  },
  {
    family: "L (Lawe)",
    characters: [
      { letter: "ለ", sound: "le", description: "L sound with neutral 'eh' vowel support" },
      { letter: "ሉ", sound: "lu", description: "L sound paired with long 'loo' sound" },
      { letter: "ሊ", sound: "li", description: "L sound paired with 'lee' sound" },
      { letter: "ላ", sound: "la", description: "L sound paired with wide 'lah' open vowel" },
      { letter: "ሌ", sound: "le", description: "L sound with 'leh'/'lay' voice tone" },
      { letter: "ል", sound: "l", description: "Soft consonant L sound or neutral syllable 'le'" },
      { letter: "ሎ", sound: "lo", description: "L sound with long rounded 'loh' vowel" }
    ]
  },
  {
    family: "M (May)",
    characters: [
      { letter: "መ", sound: "me", description: "M sound with short vocal breath 'meh'" },
      { letter: "ሙ", sound: "mu", description: "M sound paired with 'moo' sound" },
      { letter: "ሚ", sound: "mi", description: "M sound paired with 'mee' sound" },
      { letter: "ማ", sound: "ma", description: "M sound paired with native 'mah' sound" },
      { letter: "ሜ", sound: "me", description: "M sound with soft flat 'meh' sound" },
      { letter: "ም", sound: "m", description: "Hummed M consonant without active vocal release" },
      { letter: "ሞ", sound: "mo", description: "Deep rounded 'moh' sound as in 'more'" }
    ]
  },
  {
    family: "R (Re'es)",
    characters: [
      { letter: "ረ", sound: "re", description: "Tapped or rolled r-sound with 'reh'" },
      { letter: "ሩ", sound: "ru", description: "Rolled R sound with long 'roo' sound" },
      { letter: "ሪ", sound: "ri", description: "Rolled R sound with sharp 'ree' sound" },
      { letter: "ራ", sound: "ra", description: "Rolled R sound with open 'rah' sound" },
      { letter: "ሬ", sound: "re", description: "Rolled R with clean 'ray' voice pitch" },
      { letter: "ር", sound: "r", description: "Rolled rolled R consonant" },
      { letter: "ሮ", sound: "ro", description: "Rolled R with deep rounded 'roh' vowel" }
    ]
  },
  {
    family: "S (Sat)",
    characters: [
      { letter: "ሰ", sound: "se", description: "Hissing S sound as in 'seven'" },
      { letter: "ሱ", sound: "su", description: "S sound with 'soo' layout pronunciation" },
      { letter: "ሲ", sound: "si", description: "S sound with high 'see' layout pronunciation" },
      { letter: "ሳ", sound: "sa", description: "S sound paired with open 'sah' format" },
      { letter: "ሴ", sound: "se", description: "S sound with warm 'say' sound" },
      { letter: "ስ", sound: "s", description: "Soft neutral sibilant S-stem without release" },
      { letter: "ሶ", sound: "so", description: "Wide rounded S-vowel as in 'solar'" }
    ]
  }
];

export default function FidelSoundboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFidel, setSelectedFidel] = useState<{ letter: string; sound: string; description: string } | null>(null);

  const playSynthesizedTone = (sound: string, index: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      // Map vowels to frequency multipliers for a fun syllable synthesizer!
      let baseFrequency = 220; // A3 baseline
      if (sound.includes("ha")) baseFrequency *= 1.0;
      else if (sound.includes("hu") || sound.includes("lu") || sound.includes("mu") || sound.includes("ru")) baseFrequency *= 1.2;
      else if (sound.includes("hi") || sound.includes("li") || sound.includes("mi") || sound.includes("ri")) baseFrequency *= 1.5;
      else if (sound.includes("he") || sound.includes("le") || sound.includes("me") || sound.includes("re")) baseFrequency *= 1.35;
      else if (sound.includes("ho") || sound.includes("lo") || sound.includes("mo") || sound.includes("ro")) baseFrequency *= 0.9;

      // Pitch variation based on character ordinal index
      osc.frequency.setValueAtTime(baseFrequency + (index * 15), audioCtx.currentTime);

      // Create a nice human voice form (combining sine + low triangle waves)
      osc.type = "sine";
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("AudioContext blocked or unavailable:", e);
    }
  };

  const filteredFidelGroups = FIDEL_DATA.map(group => {
    const chars = group.characters.filter(
      char => 
        char.letter.includes(searchTerm) || 
        char.sound.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...group, characters: chars };
  }).filter(group => group.characters.length > 0);

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 font-sans">
            <BookOpen className="w-5 h-5 text-[#1e40af]" />
            Amharic Pronunciation Soundboard (Fidel)
          </h3>
          <p className="text-xs text-slate-500 font-sans">
            Interactive syllables trainer. Tap any Ge'ez script glyph below to read and hear its phonetic vocal sound.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search fidel or sound..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-56 pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#1e40af] focus:ring-1 focus:ring-[#1e40af]/20 bg-slate-50 font-sans"
          />
        </div>
      </div>

      <div className="space-y-6">
        {filteredFidelGroups.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 font-sans">
            No matching Amharic Fidel characters found.
          </div>
        ) : (
          filteredFidelGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="border-b border-dashed border-slate-100 last:border-0 pb-4 last:pb-0">
              <span className="text-xs font-bold text-slate-500 block mb-2 font-sans uppercase tracking-wider">
                {group.family}
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {group.characters.map((char, charIdx) => {
                  const isFocused = selectedFidel?.letter === char.letter;
                  return (
                    <button
                      key={charIdx}
                      onClick={() => {
                        setSelectedFidel(char);
                        playSynthesizedTone(char.sound, charIdx);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center relative cursor-pointer ${
                        isFocused
                          ? "bg-[#eff6ff] border-[#1e40af]/40 text-[#1e40af] ring-2 ring-[#1e40af]/10 scale-102"
                          : "bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100 hover:border-slate-350"
                      }`}
                    >
                      <span className="text-base font-bold font-sans">{char.letter}</span>
                      <span className="text-[10px] text-slate-500 font-sans mt-0.5 font-bold">/{char.sound}/</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Syllable descriptor details drawer */}
      {selectedFidel && (
        <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1e40af] uppercase tracking-wider font-sans">Character Focused</span>
            <button
              onClick={() => playSynthesizedTone(selectedFidel.sound, 1)}
              className="px-2.5 py-1 rounded-lg bg-[#eff6ff] hover:bg-blue-105 hover:text-[#1e3a8a] text-[#1e40af] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Volume2 className="w-3 h-3" />
              Re-Sound
            </button>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <h4 className="text-2xl font-black text-slate-900 font-sans">{selectedFidel.letter}</h4>
            <span className="text-xs font-bold text-slate-650 font-sans">Pronunciation: /{selectedFidel.sound}/</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">{selectedFidel.description}</p>
        </div>
      )}
    </div>
  );
}
