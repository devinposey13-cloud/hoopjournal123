import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWebSpeechFallback } from './useWebSpeechFallback';

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

  // Web Speech API fallback
  const webSpeech = useWebSpeechFallback();

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setAudioData([]);
    webSpeech.cleanup();
  }, [webSpeech]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const barCount = 24;
    const step = Math.floor(dataArray.length / barCount);
    const sampledData: number[] = [];
    for (let i = 0; i < barCount; i++) {
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000 },
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
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
      
      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Start Web Speech API in parallel as fallback
      webSpeech.start();
      
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
      
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
  }, [cleanup, updateAudioData, webSpeech]);

  const transcribeWithElevenLabs = async (audioBlob: Blob, mimeType: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast.error('Please sign in to use voice input');
      return null;
    }
    
    const formData = new FormData();
    const extension = mimeType.includes('webm') ? 'webm' 
      : mimeType.includes('mp4') ? 'mp4' 
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
      throw new Error(errorData.error || `ElevenLabs STT failed (${response.status})`);
    }
    
    const result = await response.json();
    
    if (!result.text || result.text.trim() === '') {
      return null;
    }
    
    return result.text;
  };

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        cleanup();
        setIsRecording(false);
        resolve(null);
        return;
      }

      // Stop Web Speech capture
      webSpeech.stop();

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        
        const recordedMimeType = mediaRecorder.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        
        cleanup();
        
        if (audioBlob.size < 1000) {
          toast.error('Recording too short. Please speak longer and try again.');
          resolve(null);
          return;
        }
        
        setIsTranscribing(true);
        
        try {
          // Try ElevenLabs first
          const text = await transcribeWithElevenLabs(audioBlob, recordedMimeType);
          
          if (text) {
            resolve(text);
            return;
          }
          
          // ElevenLabs returned empty — try fallback
          const fallbackText = webSpeech.getTranscript();
          if (fallbackText) {
            toast.info('Used backup transcription');
            resolve(fallbackText);
            return;
          }
          
          toast.error('Could not understand audio. Please speak clearly and try again.');
          resolve(null);
        } catch (error) {
          console.error('ElevenLabs transcription failed, trying fallback:', error);
          
          // Try Web Speech fallback
          const fallbackText = webSpeech.getTranscript();
          if (fallbackText) {
            toast.info('Used backup transcription');
            resolve(fallbackText);
            return;
          }
          
          // Both failed
          toast.error(error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.');
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };
      
      mediaRecorder.stop();
    });
  }, [cleanup, webSpeech]);

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
