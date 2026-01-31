import { useCallback, useRef, useEffect } from 'react';

type SoundType = 
  | 'make' | 'miss' | 'miss_ft' | 'miss_3pt' | 'assist' | 'rebound' | 'steal' | 'block' | 'turnover' | 'foul'
  | 'crowd_cheer' | 'crowd_groan'
  | 'milestone_common' | 'milestone_uncommon' | 'milestone_rare' | 'milestone_epic' | 'milestone_legendary'
  | 'bounce_echo' | 'arena_ambience' | 'net_swoosh';

const SOUND_PATHS: Partial<Record<SoundType, string>> = {
  make: '/sounds/make.mp3',
  miss: '/sounds/miss.mp3',
  miss_ft: '/sounds/miss_ft.mp3',
  miss_3pt: '/sounds/miss_3pt.mp3',
  assist: '/sounds/assist.mp3',
  block: '/sounds/block.mp3',
  steal: '/sounds/steal.mp3',
  turnover: '/sounds/turnover.mp3',
  foul: '/sounds/foul.mp3',
  rebound: '/sounds/rebound.mp3',
};

// ElevenLabs sound prompts for AI-generated intro sounds
const ELEVENLABS_SOUNDS: Record<string, { prompt: string; duration: number }> = {
  bounce_echo: {
    prompt: 'Basketball bouncing on hardwood gymnasium floor with deep reverb echo in empty arena, realistic sports sound',
    duration: 3,
  },
  arena_ambience: {
    prompt: 'Quiet basketball arena crowd murmur ambient atmosphere with distant sneaker squeaks on court, subtle background noise',
    duration: 5,
  },
  net_swoosh: {
    prompt: 'Basketball swishing through net clean shot nothing but net sound effect',
    duration: 2,
  },
};

const SOUND_CACHE_KEY = 'hoop_journal_intro_sounds';
const SOUND_CACHE_VERSION = 'v2';

export function useSoundEffects() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const aiSoundCache = useRef<Map<string, string>>(new Map());
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContext.current) {
        audioContext.current = new AudioContext();
      }
    };
    
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Preload all MP3 sounds
  useEffect(() => {
    Object.entries(SOUND_PATHS).forEach(([key, path]) => {
      if (path && !audioCache.current.has(key)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audioCache.current.set(key, audio);
      }
    });
  }, []);

  // Fetch and cache AI-generated sounds from ElevenLabs
  const fetchAndCacheSound = useCallback(async (soundKey: string): Promise<string | null> => {
    const soundConfig = ELEVENLABS_SOUNDS[soundKey];
    if (!soundConfig) return null;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/elevenlabs-sfx`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            prompt: soundConfig.prompt,
            duration: soundConfig.duration,
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch AI sound: ${soundKey}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.audioContent) {
        return data.audioContent;
      }
      
      return null;
    } catch (error) {
      console.warn(`Error fetching AI sound ${soundKey}:`, error);
      return null;
    }
  }, []);

  // Load cached sounds from localStorage
  const getCachedSounds = useCallback((): Record<string, string> => {
    try {
      const cached = localStorage.getItem(SOUND_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.version === SOUND_CACHE_VERSION) {
          return parsed.sounds || {};
        }
      }
    } catch (error) {
      console.warn('Failed to load cached sounds:', error);
    }
    return {};
  }, []);

  // Save sounds to localStorage cache
  const saveSoundsToCache = useCallback((sounds: Record<string, string>) => {
    try {
      localStorage.setItem(SOUND_CACHE_KEY, JSON.stringify({
        version: SOUND_CACHE_VERSION,
        sounds,
      }));
    } catch (error) {
      console.warn('Failed to cache sounds:', error);
    }
  }, []);

  // Preload all intro sounds (called before intro starts)
  const preloadIntroSounds = useCallback(async () => {
    const cachedSounds = getCachedSounds();
    const soundsToFetch: string[] = [];
    
    // Check which sounds need to be fetched
    for (const soundKey of Object.keys(ELEVENLABS_SOUNDS)) {
      if (!cachedSounds[soundKey]) {
        soundsToFetch.push(soundKey);
      } else {
        // Store cached sounds in aiSoundCache for playback
        aiSoundCache.current.set(soundKey, cachedSounds[soundKey]);
      }
    }
    
    if (soundsToFetch.length === 0) {
      console.log('All intro sounds loaded from cache');
      return;
    }

    console.log(`Fetching ${soundsToFetch.length} AI sounds...`);
    
    // Fetch sounds in parallel
    const fetchPromises = soundsToFetch.map(async (soundKey) => {
      const audioContent = await fetchAndCacheSound(soundKey);
      if (audioContent) {
        cachedSounds[soundKey] = audioContent;
        aiSoundCache.current.set(soundKey, audioContent);
      }
    });
    
    await Promise.all(fetchPromises);
    saveSoundsToCache(cachedSounds);
    console.log('AI sounds preloaded and cached');
  }, [getCachedSounds, saveSoundsToCache, fetchAndCacheSound]);

  // Play an AI-generated sound from cache
  const playAISound = useCallback((soundKey: string): boolean => {
    const base64Audio = aiSoundCache.current.get(soundKey);
    
    if (base64Audio) {
      try {
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        const audio = new Audio(audioUrl);
        audio.volume = 0.7;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
        return true;
      } catch (error) {
        console.warn(`Error playing AI sound ${soundKey}:`, error);
      }
    }
    
    return false;
  }, []);

  // Generate synthetic sounds using Web Audio API
  const generateSyntheticSound = useCallback((type: SoundType) => {
    if (!audioContext.current) {
      audioContext.current = new AudioContext();
    }
    
    const ctx = audioContext.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    switch (type) {
      case 'make':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
        
      case 'miss':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'rebound':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        oscillator.start(now);
        oscillator.stop(now + 0.12);
        break;
        
      case 'steal':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'block':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'turnover':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.setValueAtTime(180, now + 0.05);
        oscillator.frequency.setValueAtTime(200, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'crowd_cheer':
        createCrowdCheer(ctx, now);
        return;
        
      case 'crowd_groan':
        createCrowdGroan(ctx, now);
        return;
        
      case 'milestone_common':
        createMilestoneSound(ctx, now, 'common');
        return;
        
      case 'milestone_uncommon':
        createMilestoneSound(ctx, now, 'uncommon');
        return;
        
      case 'milestone_rare':
        createMilestoneSound(ctx, now, 'rare');
        return;
        
      case 'milestone_epic':
        createMilestoneSound(ctx, now, 'epic');
        return;
        
      case 'milestone_legendary':
        createMilestoneSound(ctx, now, 'legendary');
        return;

      case 'bounce_echo':
        createBounceEcho(ctx, now);
        return;

      case 'arena_ambience':
        createArenaAmbience(ctx, now);
        return;
        
      default:
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }
  }, []);

  // Play a custom MP3 sound
  const playSound = useCallback((type: SoundType) => {
    // Check if this is an AI-generated sound type
    if (ELEVENLABS_SOUNDS[type]) {
      const played = playAISound(type);
      if (played) return;
      // Fall through to synthetic fallback if AI sound not available
    }

    const path = SOUND_PATHS[type];
    
    if (path) {
      let audio = audioCache.current.get(type);
      if (!audio) {
        audio = new Audio(path);
        audioCache.current.set(type, audio);
      }
      
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = 0.7;
      clone.play().catch(() => {});
      return;
    }

    // Fallback: Generate synthetic sounds
    generateSyntheticSound(type);
  }, [playAISound, generateSyntheticSound]);

  return { playSound, preloadIntroSounds };
}

// Create crowd cheer effect using multiple oscillators and noise
function createCrowdCheer(ctx: AudioContext, now: number) {
  const bufferSize = ctx.sampleRate * 0.8;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.linearRampToValueAtTime(1200, now + 0.3);
  filter.Q.value = 0.5;
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
  noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.4);
  noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.8);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noise.start(now);
  noise.stop(now + 0.8);
  
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'sine';
    const baseFreq = 300 + i * 100;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq + 200, now + 0.5);
    
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
    oscGain.gain.linearRampToValueAtTime(0.01, now + 0.6);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    osc.start(now + i * 0.05);
    osc.stop(now + 0.7);
  }
}

// Create crowd groan effect
function createCrowdGroan(ctx: AudioContext, now: number) {
  const bufferSize = ctx.sampleRate * 0.6;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, now);
  filter.frequency.linearRampToValueAtTime(200, now + 0.5);
  filter.Q.value = 0.8;
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.1);
  noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.6);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noise.start(now);
  noise.stop(now + 0.6);
  
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'sine';
    const baseFreq = 250 - i * 30;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq - 80, now + 0.4);
    
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.06, now + 0.1);
    oscGain.gain.linearRampToValueAtTime(0.01, now + 0.5);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    osc.start(now + i * 0.03);
    osc.stop(now + 0.5);
  }
}

// Create milestone celebration sounds based on rarity
function createMilestoneSound(ctx: AudioContext, now: number, rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') {
  const baseConfigs = {
    common: { notes: [523, 659], duration: 0.4, volume: 0.2 },
    uncommon: { notes: [523, 659, 784], duration: 0.5, volume: 0.25 },
    rare: { notes: [523, 659, 784, 1047], duration: 0.7, volume: 0.3 },
    epic: { notes: [392, 523, 659, 784, 1047], duration: 0.9, volume: 0.35 },
    legendary: { notes: [392, 494, 587, 698, 784, 988, 1175], duration: 1.2, volume: 0.4 },
  };

  const config = baseConfigs[rarity];
  
  config.notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = rarity === 'legendary' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    
    if (rarity === 'epic' || rarity === 'legendary') {
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = freq * 0.02;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(now);
      vibrato.stop(now + config.duration);
    }
    
    const startTime = now + i * 0.08;
    const noteLength = config.duration - i * 0.06;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(config.volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + Math.max(0.1, noteLength));
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + Math.max(0.1, noteLength));
  });

  if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
    const shimmerCount = rarity === 'legendary' ? 6 : rarity === 'epic' ? 4 : 2;
    
    for (let i = 0; i < shimmerCount; i++) {
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      
      shimmer.type = 'sine';
      const shimmerFreq = 2000 + Math.random() * 2000;
      shimmer.frequency.setValueAtTime(shimmerFreq, now);
      shimmer.frequency.exponentialRampToValueAtTime(shimmerFreq * 1.5, now + 0.3);
      
      const shimmerStart = now + 0.2 + i * 0.1;
      shimmerGain.gain.setValueAtTime(0, shimmerStart);
      shimmerGain.gain.linearRampToValueAtTime(0.08, shimmerStart + 0.03);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, shimmerStart + 0.2);
      
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      
      shimmer.start(shimmerStart);
      shimmer.stop(shimmerStart + 0.25);
    }
  }

  if (rarity === 'epic' || rarity === 'legendary') {
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    bass.type = 'sine';
    bass.frequency.setValueAtTime(rarity === 'legendary' ? 80 : 100, now);
    bass.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    
    bassGain.gain.setValueAtTime(0.3, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    bass.start(now);
    bass.stop(now + 0.3);
  }
}

// Create deep basketball bounce with reverb echo
function createBounceEcho(ctx: AudioContext, now: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
  
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.5);
  
  for (let i = 1; i <= 3; i++) {
    const echoOsc = ctx.createOscillator();
    const echoGain = ctx.createGain();
    
    echoOsc.type = 'sine';
    const echoTime = now + i * 0.15;
    echoOsc.frequency.setValueAtTime(100 - i * 15, echoTime);
    echoOsc.frequency.exponentialRampToValueAtTime(40, echoTime + 0.3);
    
    const echoVolume = 0.2 / (i + 1);
    echoGain.gain.setValueAtTime(echoVolume, echoTime);
    echoGain.gain.exponentialRampToValueAtTime(0.001, echoTime + 0.3);
    
    echoOsc.connect(echoGain);
    echoGain.connect(ctx.destination);
    
    echoOsc.start(echoTime);
    echoOsc.stop(echoTime + 0.35);
  }
}

// Create soft arena ambience
function createArenaAmbience(ctx: AudioContext, now: number) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.5;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);
  filter.Q.value = 0.5;
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
  noiseGain.gain.linearRampToValueAtTime(0.06, now + 1.5);
  noiseGain.gain.linearRampToValueAtTime(0.01, now + 2);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noise.start(now);
  noise.stop(now + 2);
  
  const hum = ctx.createOscillator();
  const humGain = ctx.createGain();
  
  hum.type = 'sine';
  hum.frequency.setValueAtTime(60, now);
  
  humGain.gain.setValueAtTime(0, now);
  humGain.gain.linearRampToValueAtTime(0.03, now + 0.5);
  humGain.gain.linearRampToValueAtTime(0.01, now + 2);
  
  hum.connect(humGain);
  humGain.connect(ctx.destination);
  
  hum.start(now);
  hum.stop(now + 2);
}
