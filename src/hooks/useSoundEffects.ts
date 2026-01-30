import { useCallback, useRef, useEffect } from 'react';

type SoundType = 
  | 'make' | 'miss' | 'assist' | 'rebound' | 'steal' | 'block' | 'turnover' 
  | 'crowd_cheer' | 'crowd_groan'
  | 'milestone_common' | 'milestone_uncommon' | 'milestone_rare' | 'milestone_epic' | 'milestone_legendary';

const SOUND_PATHS: Partial<Record<SoundType, string>> = {
  make: '/sounds/make.mp3',
  assist: '/sounds/assist.mp3',
  block: '/sounds/block.mp3',
  steal: '/sounds/steal.mp3',
  turnover: '/sounds/turnover.mp3',
};

export function useSoundEffects() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
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

  // Preload all sounds
  useEffect(() => {
    Object.entries(SOUND_PATHS).forEach(([key, path]) => {
      if (path && !audioCache.current.has(key)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audioCache.current.set(key, audio);
      }
    });
  }, []);

  // Play a custom MP3 sound
  const playSound = useCallback((type: SoundType) => {
    const path = SOUND_PATHS[type];
    
    if (path) {
      // Use cached audio element or create new one
      let audio = audioCache.current.get(type);
      if (!audio) {
        audio = new Audio(path);
        audioCache.current.set(type, audio);
      }
      
      // Clone and play to allow overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = 0.7;
      clone.play().catch(() => {
        // Ignore autoplay errors
      });
      return;
    }

    // Fallback: Generate synthetic sounds for types without MP3
    generateSyntheticSound(type);
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
        // Swoosh up sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
        
      case 'miss':
        // Low thud
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'rebound':
        // Bounce sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        oscillator.start(now);
        oscillator.stop(now + 0.12);
        break;
        
      case 'steal':
        // Quick zip
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'block':
        // Impact thump
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'turnover':
        // Error buzz
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
        // Crowd cheering - layered noise with rising pitch
        createCrowdCheer(ctx, now);
        return; // Early return since we handle this separately
        
      case 'crowd_groan':
        // Crowd groaning - low frequency descending
        createCrowdGroan(ctx, now);
        return; // Early return since we handle this separately
        
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
        
      default:
        // Default click
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }
  }, []);

  return { playSound };
}

// Create crowd cheer effect using multiple oscillators and noise
function createCrowdCheer(ctx: AudioContext, now: number) {
  // Create white noise for crowd ambience
  const bufferSize = ctx.sampleRate * 0.8;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  // Bandpass filter to make it sound more like voices
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
  
  // Add some tonal elements for "wooo" sound
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
  // Create noise for crowd
  const bufferSize = ctx.sampleRate * 0.6;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  // Lower frequency filter for groan
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
  
  // Descending "awww" tones
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
    common: { 
      notes: [523, 659], // C5, E5
      duration: 0.4,
      volume: 0.2,
    },
    uncommon: { 
      notes: [523, 659, 784], // C5, E5, G5
      duration: 0.5,
      volume: 0.25,
    },
    rare: { 
      notes: [523, 659, 784, 1047], // C5, E5, G5, C6
      duration: 0.7,
      volume: 0.3,
    },
    epic: { 
      notes: [392, 523, 659, 784, 1047], // G4, C5, E5, G5, C6
      duration: 0.9,
      volume: 0.35,
    },
    legendary: { 
      notes: [392, 494, 587, 698, 784, 988, 1175], // G4, B4, D5, F5, G5, B5, D6
      duration: 1.2,
      volume: 0.4,
    },
  };

  const config = baseConfigs[rarity];
  
  // Create arpeggio effect
  config.notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = rarity === 'legendary' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    
    // Add slight vibrato for epic/legendary
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

  // Add shimmer effect for rare and above
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

  // Add bass impact for epic and legendary
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
