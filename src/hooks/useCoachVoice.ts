import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

interface UseCoachVoiceReturn {
  playingIndex: number | null;
  isLoadingAudio: boolean;
  playVoice: (text: string, index: number, overrideVoiceGender?: 'male' | 'female') => Promise<void>;
  stopVoice: () => void;
}

export function useCoachVoice(externalVoiceGender?: 'male' | 'female'): UseCoachVoiceReturn {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [fetchedVoiceGender, setFetchedVoiceGender] = useState<'male' | 'female'>('male');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Use external prop if provided, otherwise fall back to fetched value
  const userVoiceGender = externalVoiceGender || fetchedVoiceGender;

  // Fetch user's voice preference on mount (fallback when no external prop)
  useEffect(() => {
    if (externalVoiceGender) return; // Skip fetch if externally provided
    
    const fetchVoicePreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('player_settings')
          .select('coach_voice_gender')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.coach_voice_gender) {
          setFetchedVoiceGender(data.coach_voice_gender as 'male' | 'female');
        }
      } catch (error) {
        console.error('Error fetching voice preference:', error);
      }
    };

    fetchVoicePreference();
  }, [externalVoiceGender]);

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

  const playVoice = useCallback(async (text: string, index: number, overrideVoiceGender?: 'male' | 'female') => {
    // Use override if provided, otherwise use user's stored preference
    const voiceGender = overrideVoiceGender || userVoiceGender;
    // If already playing this message, stop it
    if (playingIndex === index) {
      stopVoice();
      return;
    }

    // Stop any currently playing audio
    stopVoice();

    // CRITICAL: Create Audio element IMMEDIATELY within user gesture context
    // This must happen BEFORE any async operations for mobile compatibility
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    setIsLoadingAudio(true);
    setPlayingIndex(index);

    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to use voice playback');
      }

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
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: cleanText, voiceGender }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = audioUrl;

      // Set source on the pre-created audio element (mobile compatible)
      audio.src = audioUrl;

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

      await audio.play();
    } catch (error) {
      console.error('Voice playback error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to play coaching advice');
      setPlayingIndex(null);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [playingIndex, stopVoice, userVoiceGender]);

  return {
    playingIndex,
    isLoadingAudio,
    playVoice,
    stopVoice,
  };
}
