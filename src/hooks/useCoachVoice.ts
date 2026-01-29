import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

interface UseCoachVoiceReturn {
  playingIndex: number | null;
  isLoadingAudio: boolean;
  playVoice: (text: string, index: number) => Promise<void>;
  stopVoice: () => void;
}

export function useCoachVoice(): UseCoachVoiceReturn {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const stopVoice = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingIndex(null);
  }, []);

  const playVoice = useCallback(async (text: string, index: number) => {
    // If already playing this message, stop it
    if (playingIndex === index) {
      stopVoice();
      return;
    }

    // Stop any currently playing audio
    stopVoice();

    setIsLoadingAudio(true);

    try {
      // Strip markdown for cleaner speech
      const cleanText = text
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
        .replace(/[-*+]\s/g, '') // Remove list markers
        .trim();

      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingIndex(null);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setPlayingIndex(null);
        toast.error('Failed to play audio');
      };

      setPlayingIndex(index);
      await audio.play();
    } catch (error) {
      console.error('Voice playback error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to play coaching advice');
      setPlayingIndex(null);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [playingIndex, stopVoice]);

  return {
    playingIndex,
    isLoadingAudio,
    playVoice,
    stopVoice,
  };
}
