/**
 * Custom Web Audio playing utility for decoding and playing 
 * little-endian 16-bit linear PCM audio stream buffers returned by the Gemini TTS engine.
 */

let activeAudioContext: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeLoopTimeout: any = null;
let isPlaybackLoopCancelled = false;

export function stopAnyActivePlayback() {
  isPlaybackLoopCancelled = true;
  if (activeLoopTimeout) {
    clearTimeout(activeLoopTimeout);
    activeLoopTimeout = null;
  }
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
    } catch (e) {
      // already stopped
    }
    activeSourceNode = null;
  }
}

export function playRawPcmBase64(base64Str: string, sampleRate = 24000, playbackRate = 1.0, volume = 1.0, loop = false): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      stopAnyActivePlayback();
      isPlaybackLoopCancelled = false;

      // Initialize or resume context
      if (!activeAudioContext) {
        activeAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (activeAudioContext.state === "suspended") {
        activeAudioContext.resume();
      }

      // Convert base64 to binary string
      const binaryString = atob(base64Str);
      const len = binaryString.length;
      
      // We expect 16-bit PCM, so each sample is 2 bytes
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Read Little Endian 16-bit signing
      const int16Buffer = new Int16Array(bytes.buffer);
      const floatBuffer = new Float32Array(int16Buffer.length);

      // Normalize into floated float samples [-1.0, 1.0]
      for (let i = 0; i < int16Buffer.length; i++) {
        floatBuffer[i] = int16Buffer[i] / 32768.0;
      }

      // Construct audio channel mapping
      const audioBuffer = activeAudioContext.createBuffer(1, floatBuffer.length, sampleRate);
      audioBuffer.copyToChannel(floatBuffer, 0);

      const sourceNode = activeAudioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.playbackRate.value = playbackRate;
      sourceNode.loop = loop;

      // Support volume adjustment via GainNode
      const gainNode = activeAudioContext.createGain();
      gainNode.gain.value = volume;

      sourceNode.connect(gainNode);
      gainNode.connect(activeAudioContext.destination);
      
      activeSourceNode = sourceNode;
      
      sourceNode.onended = () => {
        if (activeSourceNode === sourceNode) {
          activeSourceNode = null;
        }
        resolve();
      };

      sourceNode.start(0);
    } catch (err) {
      console.error("PCM synthesis and playback failed:", err);
      reject(err);
    }
  });
}

/**
 * Clean offline speaker utility utilizing browser-native Speech Synthesis.
 * Ideal for English translations, working completely without web access.
 */
export function getAvailableVoicesForLang(voiceLangCode: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  const targetPrefix = voiceLangCode.split("-")[0].toLowerCase();
  
  const matched = voices.filter(v => 
    v.lang.toLowerCase() === voiceLangCode.toLowerCase() ||
    v.lang.toLowerCase().startsWith(targetPrefix + "-") ||
    v.lang.toLowerCase() === targetPrefix
  );

  // Sort: high-quality keywords first
  return matched.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const keywords = ["natural", "premium", "neural", "google", "siri", "aria", "guy", "jenny", "david", "zira", "shanshan", "xiaoxiao"];
    
    let aScore = 0;
    let bScore = 0;
    
    for (const kw of keywords) {
      if (aName.includes(kw)) aScore += 10;
      if (bName.includes(kw)) bScore += 10;
    }
    
    if (a.localService) aScore += 1;
    if (b.localService) bScore += 1;
    
    return bScore - aScore;
  });
}

export function playOfflineSpeech(
  text: string, 
  voiceLang = "en-US", 
  onEnd?: () => void, 
  playbackRate = 1.0, 
  preferredVoiceURI?: string, 
  volume = 1.0, 
  loop = false,
  isIteration = false
) {
  if (!isIteration) {
    stopAnyActivePlayback();
    isPlaybackLoopCancelled = false;
  }

  if (isPlaybackLoopCancelled) {
    if (onEnd) onEnd();
    return;
  }

  if (!window.speechSynthesis) {
    console.warn("SpeechSynthesis is unsupported in this browser.");
    if (onEnd) onEnd();
    return;
  }
  
  if (!isIteration) {
    window.speechSynthesis.cancel(); // Clears queue
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLang;
  utterance.rate = playbackRate;
  utterance.volume = volume;
  
  const voices = window.speechSynthesis.getVoices();
  if (preferredVoiceURI) {
    const selected = voices.find(v => v.voiceURI === preferredVoiceURI);
    if (selected) {
      utterance.voice = selected;
    }
  }
  
  if (!utterance.voice) {
    // Falls back to our ranked high-quality voices algorithm
    const sorted = getAvailableVoicesForLang(voiceLang);
    if (sorted.length > 0) {
      utterance.voice = sorted[0];
    } else {
      const fallbackMatch = voices.find(v => v.lang.startsWith(voiceLang.split("-")[0]));
      if (fallbackMatch) {
         utterance.voice = fallbackMatch;
      }
    }
  }

  if (loop) {
    utterance.onend = () => {
      if (isPlaybackLoopCancelled) {
        if (onEnd) onEnd();
        return;
      }
      activeLoopTimeout = setTimeout(() => {
        playOfflineSpeech(text, voiceLang, onEnd, playbackRate, preferredVoiceURI, volume, loop, true);
      }, 500);
    };
    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error on loop: ", e);
      if (onEnd) onEnd();
    };
  } else if (onEnd) {
    utterance.onend = () => {
      onEnd();
    };
    utterance.onerror = () => {
      onEnd();
    };
  }
  
  window.speechSynthesis.speak(utterance);
}
