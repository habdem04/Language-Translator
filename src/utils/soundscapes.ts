/**
 * Procedural Web Audio Ambient Soundscape Synthesizer
 * Synthesizes comforting, low-volume background noise environments completely client-side.
 * No external media assets/MP3s required, 100% offline-ready and lightweight.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeSources: { source: AudioBufferSourceNode; filter?: BiquadFilterNode }[] = [];
let soundscapeIntervals: any[] = [];

// Helper to create offline-generated noise buffer
function createNoiseBuffer(ctx: AudioContext, duration = 4.0, type: "white" | "pink" | "brown" = "white"): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastOut = 0.0; // For brown noise filtering
  // For pink noise filtering:
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "white") {
      data[i] = white;
    } else if (type === "pink") {
      // Pink noise refinement (Paul Kellet's method)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.12; // Compensate amplitude
      b6 = white * 0.115926;
    } else if (type === "brown") {
      // Brown noise (integration of white noise)
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 4.0; // Compensate amplitude limit
    }
  }
  return buffer;
}

// Procedural coffee mug clink / ceramic clatter sound generator
function triggerCafeClink(ctx: AudioContext, destination: AudioNode) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Choose clean resonant frequencies resembling ceramic hit
    const baseFreq = 1200 + Math.random() * 1800; // 1.2kHz - 3.0kHz
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    
    // High-pass filter for clean clink
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    
    // Rapid exponential amplitude decay envelope
    const duration = 0.08 + Math.random() * 0.12; // 80 - 180ms
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.008 + Math.random() * 0.015, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch (err) {
    console.warn("Clink synth failed", err);
  }
}

// Procedural random murmur chatter swell generator
function triggerCafeChatterSwell(ctx: AudioContext, destination: AudioNode) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Vocal frequency range modulation
    const centerFreq = 180 + Math.random() * 120; // 180Hz - 300Hz
    osc.type = "triangle";
    osc.frequency.setValueAtTime(centerFreq, ctx.currentTime);
    
    // Bandpass filter to emulate far away vowel talking
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(centerFreq, ctx.currentTime);
    filter.Q.setValueAtTime(8.0, ctx.currentTime);
    
    // Slower volume sweep
    const duration = 1.0 + Math.random() * 2.5; // 1.0 - 3.5s
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.015 + Math.random() * 0.02, ctx.currentTime + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0.00001, ctx.currentTime + duration);
    
    // Slowly sweep filter frequency up and down to emulate speech intonation
    filter.frequency.linearRampToValueAtTime(centerFreq + (Math.random() * 60 - 30), ctx.currentTime + duration * 0.5);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch (err) {
    console.warn("Chatter swell synth failed", err);
  }
}

// Procedural random page flip rustle generator for library
function triggerPageRustle(ctx: AudioContext, destination: AudioNode) {
  try {
    const noiseBuf = createNoiseBuffer(ctx, 0.4, "pink");
    const source = ctx.createBufferSource();
    source.buffer = noiseBuf;
    
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1500, ctx.currentTime);
    filter.Q.setValueAtTime(4.0, ctx.currentTime);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    
    // Flapping/rustling ramp pattern
    gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 0.15);
    gain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.38);
    
    // Sweep the filter to simulate sliding paper texture
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.35);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    
    source.start();
    source.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn("Library rustle failed", err);
  }
}

// Procedural continuous rain drop impact simulation click generators
function triggerRainPatter(ctx: AudioContext, destination: AudioNode) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Super fast clicking chirp
    osc.type = "sine";
    osc.frequency.setValueAtTime(3000 + Math.random() * 2000, ctx.currentTime);
    
    // Narrow bandpass frequency filter
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3500, ctx.currentTime);
    filter.Q.setValueAtTime(12.0, ctx.currentTime);
    
    const duration = 0.015 + Math.random() * 0.02; // micro patters
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.20 + Math.random() * 0.15, ctx.currentTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.005);
  } catch (err) {}
}

export function startSoundscape(type: "none" | "addis_cafe" | "library" | "nature_rain", volume = 0.15) {
  // Reset any active soundscape
  stopSoundscape();
  
  if (type === "none") return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
    
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    
    console.log(`[Soundscape Synth] Starting procedural soundscape: ${type} at level: ${volume}`);
    
    if (type === "addis_cafe") {
      // Cafe In Addis sound elements
      // 1. Core room acoustics: low, warm brown noise
      const acousticBuf = createNoiseBuffer(audioCtx, 4.0, "brown");
      const rumblesource = audioCtx.createBufferSource();
      rumblesource.buffer = acousticBuf;
      rumblesource.loop = true;
      
      const lowFilter = audioCtx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.setValueAtTime(280, audioCtx.currentTime); // Low bar hum
      
      const lowGain = audioCtx.createGain();
      lowGain.gain.setValueAtTime(0.65, audioCtx.currentTime);
      
      rumblesource.connect(lowFilter);
      lowFilter.connect(lowGain);
      lowGain.connect(masterGain);
      
      rumblesource.start();
      activeSources.push({ source: rumblesource, filter: lowFilter });
      
      // 2. High-pass background coffee steam / espresso machine whisper
      const steamBuf = createNoiseBuffer(audioCtx, 3.5, "pink");
      const steamsource = audioCtx.createBufferSource();
      steamsource.buffer = steamBuf;
      steamsource.loop = true;
      
      const steamFilter = audioCtx.createBiquadFilter();
      steamFilter.type = "bandpass";
      steamFilter.frequency.setValueAtTime(1400, audioCtx.currentTime);
      steamFilter.Q.setValueAtTime(0.8, audioCtx.currentTime);
      
      const steamGain = audioCtx.createGain();
      steamGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      
      steamsource.connect(steamFilter);
      steamFilter.connect(steamGain);
      steamGain.connect(masterGain);
      
      steamsource.start();
      activeSources.push({ source: steamsource, filter: steamFilter });
      
      // 3. Periodic procedural mug clinks (every 1.5 - 3.5 seconds)
      const clinkTimer = setInterval(() => {
        if (audioCtx && masterGain) {
          triggerCafeClink(audioCtx, masterGain);
        }
      }, 2500);
      soundscapeIntervals.push(clinkTimer);
      
      // 4. Periodic randomized human voice murmurs
      const murmurTimer = setInterval(() => {
        if (audioCtx && masterGain) {
          triggerCafeChatterSwell(audioCtx, masterGain);
        }
      }, 1800);
      soundscapeIntervals.push(murmurTimer);
      
    } else if (type === "library") {
      // Library Silence: deep, therapeutic dead silence room rumbles
      // 1. Extreme low-bass room tone
      const rumbleBuf = createNoiseBuffer(audioCtx, 5.0, "brown");
      const rumblesource = audioCtx.createBufferSource();
      rumblesource.buffer = rumbleBuf;
      rumblesource.loop = true;
      
      const lowFilter = audioCtx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.setValueAtTime(75, audioCtx.currentTime); // very isolated space hum
      
      const lowGain = audioCtx.createGain();
      lowGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
      
      rumblesource.connect(lowFilter);
      lowFilter.connect(lowGain);
      lowGain.connect(masterGain);
      
      rumblesource.start();
      activeSources.push({ source: rumblesource, filter: lowFilter });
      
      // 2. Periodic paper rustles (every 8 - 15 seconds)
      const pageTimer = setInterval(() => {
        if (audioCtx && masterGain && Math.random() > 0.3) {
          triggerPageRustle(audioCtx, masterGain);
        }
      }, 7000);
      soundscapeIntervals.push(pageTimer);

    } else if (type === "nature_rain") {
      // Rain against window pane pane
      // 1. Continuous falling rain canvas
      const rainBuf = createNoiseBuffer(audioCtx, 3.0, "pink");
      const rainsource = audioCtx.createBufferSource();
      rainsource.buffer = rainBuf;
      rainsource.loop = true;
      
      const rainFilter = audioCtx.createBiquadFilter();
      rainFilter.type = "lowpass";
      rainFilter.frequency.setValueAtTime(1100, audioCtx.currentTime);
      
      const rainGain = audioCtx.createGain();
      rainGain.gain.setValueAtTime(0.75, audioCtx.currentTime);
      
      rainsource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(masterGain);
      
      rainsource.start();
      activeSources.push({ source: rainsource, filter: rainFilter });
      
      // 2. High-speed granular raindrops patter drops
      const patterTimer = setInterval(() => {
        if (audioCtx && masterGain) {
          // Play a small cloud of drops
          const count = 3 + Math.floor(Math.random() * 5);
          for (let k = 0; k < count; k++) {
            const delay = Math.random() * 120;
            setTimeout(() => {
              if (audioCtx && masterGain) {
                triggerRainPatter(audioCtx, masterGain);
              }
            }, delay);
          }
        }
      }, 350);
      soundscapeIntervals.push(patterTimer);
    }
  } catch (error) {
    console.error("Failed to start procedural ambient soundscapes:", error);
  }
}

export function stopSoundscape() {
  soundscapeIntervals.forEach(t => clearInterval(t));
  soundscapeIntervals = [];
  
  activeSources.forEach(as => {
    try {
      as.source.stop();
    } catch (e) {}
  });
  activeSources = [];
  
  if (masterGain) {
    masterGain.disconnect();
    masterGain = null;
  }
  
  if (audioCtx) {
    if (audioCtx.state !== "closed") {
      audioCtx.close().catch(() => {});
    }
    audioCtx = null;
  }
}

export function setSoundscapeVolume(volume: number) {
  if (masterGain && audioCtx) {
    console.log(`[Soundscape Synth] Updating background volume parameter: ${volume}`);
    masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
  }
}
