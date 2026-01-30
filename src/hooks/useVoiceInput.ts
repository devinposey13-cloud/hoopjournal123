import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const STT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`;

interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  audioData: number[];
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioData, setAudioData] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear timeout
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setAudioData([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Sample 24 bars from the frequency data
    const barCount = 24;
    const step = Math.floor(dataArray.length / barCount);
    const sampledData: number[] = [];
    
    for (let i = 0; i < barCount; i++) {
      // Average a range of frequencies for each bar
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j];
      }
      sampledData.push(sum / step);
    }
    
    setAudioData(sampledData);
    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission with mobile-optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Mobile-specific: don't require specific sample rates
          sampleRate: { ideal: 16000 },
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Set up audio analysis with mobile AudioContext handling
      // Use webkitAudioContext for older iOS Safari
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      // Resume AudioContext if suspended (required on iOS/mobile after user gesture)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Determine best supported format - prioritize formats that work on mobile
      // iOS Safari supports audio/mp4, Android supports audio/webm
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      }
      
      console.log('Using audio MIME type:', mimeType);
      
      // Create MediaRecorder with fallback for unsupported mimeType
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (e) {
        console.warn('Failed to create MediaRecorder with mimeType:', mimeType, 'falling back to default');
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      // Start audio visualization
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
      
      // Auto-stop after 60 seconds
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          toast.info('Maximum recording time reached (60 seconds)');
          stopRecording();
        }
      }, 60000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast.error('Microphone access denied. Please enable microphone access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          toast.error('No microphone found. Please connect a microphone and try again.');
        } else {
          toast.error('Could not access microphone. Please check your device settings.');
        }
      } else {
        toast.error('Failed to start recording. Please try again.');
      }
      
      cleanup();
      throw error;
    }
  }, [cleanup, updateAudioData]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        cleanup();
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        cleanup();
        
        // Check if we have audio data
        if (audioBlob.size < 1000) {
          toast.error('Recording too short. Please speak longer and try again.');
          resolve(null);
          return;
        }
        
        // Transcribe the audio
        setIsTranscribing(true);
        
        try {
          // Get the current session for authentication
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.access_token) {
            toast.error('Please sign in to use voice input');
            resolve(null);
            return;
          }
          
          const formData = new FormData();
          const extension = mediaRecorder.mimeType.includes('webm') ? 'webm' 
            : mediaRecorder.mimeType.includes('mp4') ? 'mp4' 
            : 'wav';
          formData.append('audio', audioBlob, `recording.${extension}`);
          
          const response = await fetch(STT_URL, {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transcription failed');
          }
          
          const result = await response.json();
          
          if (!result.text || result.text.trim() === '') {
            toast.error('Could not understand audio. Please speak clearly and try again.');
            resolve(null);
            return;
          }
          
          resolve(result.text);
        } catch (error) {
          console.error('Transcription error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.');
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };
      
      mediaRecorder.stop();
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
    setIsTranscribing(false);
  }, [cleanup]);

  return {
    isRecording,
    isTranscribing,
    audioData,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
